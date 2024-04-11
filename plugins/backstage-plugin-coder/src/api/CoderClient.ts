/**
 * @file This class is a little chaotic. It's basically in charge of juggling
 * and coordinating several different systems together:
 *
 * 1. Backstage APIs (API classes/factories, as well as proxies)
 * 2. React (making sure that mutable class state can be turned into immutable
 *    state snapshots that are available synchronously from the first render)
 * 3. The custom auth API(s) that we build out for Backstage
 * 4. The Coder SDK
 * 5. The global Axios instance (which we need, because it's what the Coder SDK
 *    uses)
 *
 * All while being easy for the end-user to drop into their own Backstage
 * deployment.
 *
 * ---
 *
 * @todo Whenever we do make a full, proper Coder SDK, make sure that it is
 * designed around the axios.create method and Axios instances. That way, we
 * don't have to worry about Axios request conflicts when trying to set up
 * interceptors. We do not want to throw everything into the global Axios
 * instance and be forced to pray that things don't break
 */
import axios, { type InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as coderSdkApi from 'coder/site/src/api/api';
import { DiscoveryApi, createApiRef } from '@backstage/core-plugin-api';
import { BackstageHttpError } from './errors';

import type { CoderAuthApi } from './Auth';
import { CODER_API_REF_ID_PREFIX } from '../typesConstants';
import { StateSnapshotManager } from '../utils/StateSnapshotManager';
import type {
  Workspace,
  WorkspacesResponse,
} from 'coder/site/src/api/typesGenerated';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';

type CoderClientConfigOptions = Readonly<{
  proxyPrefix: string;
  apiRoutePrefix: string;
  authHeaderKey: string;
  assetsRoutePrefix: string;
  requestTimeoutMs: number;
}>;

export const defaultCoderClientConfigOptions = {
  proxyPrefix: '/coder',
  apiRoutePrefix: '/api/v2',
  assetsRoutePrefix: '/', // Deliberately left as single slash
  authHeaderKey: 'Coder-Session-Token',
  requestTimeoutMs: 20_000,
} as const satisfies CoderClientConfigOptions;

export type CoderClientSnapshot = Readonly<{
  isAuthValid: boolean;
  apiRoute: string;
  assetsRoute: string;
}>;

type RawCoderSdkApi = typeof coderSdkApi;
export type CoderSdkApi = Readonly<
  RawCoderSdkApi & {
    getWorkspacesByRepo: (
      coderQuery: string,
      config: CoderWorkspacesConfig,
    ) => Promise<readonly Workspace[]>;
  }
>;

type SubscriptionCallback = (newSnapshot: CoderClientSnapshot) => void;

export type CoderClientApi = Readonly<{
  sdkApi: CoderSdkApi;
  isAuthValid: boolean;
  validateAuth: () => Promise<boolean>;

  getStateSnapshot: () => CoderClientSnapshot;
  unsubscribe: (callback: SubscriptionCallback) => void;
  subscribe: (callback: SubscriptionCallback) => () => void;
}>;

export class CoderClient implements CoderClientApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly authApi: CoderAuthApi;
  private readonly options: CoderClientConfigOptions;
  private readonly snapshotManager: StateSnapshotManager<CoderClientSnapshot>;

  private latestProxyEndpoint: string;
  readonly sdkApi: CoderSdkApi;

  constructor(
    discoveryApi: DiscoveryApi,
    authApi: CoderAuthApi,
    options?: Partial<CoderClientConfigOptions>,
  ) {
    // The "easy setup" part - initialize internal properties
    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.latestProxyEndpoint = '';
    this.options = { ...defaultCoderClientConfigOptions, ...(options ?? {}) };

    // Wire up API namespace and patch in additional functions for end-user
    // convenience
    this.sdkApi = {
      ...coderSdkApi,
      getWorkspaces: this.getWorkspaces,
      getWorkspacesByRepo: this.getWorkspacesByRepo,
    };

    // Wire up Backstage APIs and Axios to be aware of each other
    axios.interceptors.request.use(this.interceptAxiosRequest);

    // Hook up snapshot manager so that external systems can be made aware when
    // state changes in a render-safe way
    this.snapshotManager = new StateSnapshotManager({
      initialSnapshot: this.prepareNewStateSnapshot(),
    });

    // Call DiscoveryApi to populate initial endpoint path, so that the path
    // can be accessed synchronously from the UI. Should be called last after
    // all other initialization steps
    void this.getProxyEndpoint();
  }

  get isAuthValid(): boolean {
    return this.authApi.isTokenValid;
  }

  /* ***************************************************************************
   * There is some funky (but necessary) stuff going on in this class - a lot of
   * the methods are passed around to other systems. Just to be on the safe
   * side, all methods (public and private) should be defined as arrow
   * functions, to ensure the methods can't ever lose their `this` contexts
   *
   * This technically defeats some of the memory optimizations you would
   * normally get with class methods (arrow methods will be rebuilt from
   * scratch each time the class is instantiated), but because CoderClient will
   * likely be instantiated only once for the entire app's lifecycle, that won't
   * matter much at all
   ****************************************************************************/

  // Request configs are created on the per-request basis, so mutating a config
  // won't mess up future non-Coder requests that also uses Axios
  private interceptAxiosRequest = async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const { apiRoutePrefix, authHeaderKey } = this.options;

    const isCoderApiRequest = config.url?.startsWith(apiRoutePrefix) ?? false;
    if (!isCoderApiRequest) {
      return config;
    }

    config.baseURL = await this.getProxyEndpoint();
    config.headers[authHeaderKey] = this.authApi.token;
    return config;
  };

  private prepareNewStateSnapshot = (): CoderClientSnapshot => {
    const base = this.latestProxyEndpoint;
    const { proxyPrefix, apiRoutePrefix, assetsRoutePrefix } = this.options;

    return {
      isAuthValid: this.authApi.isTokenValid,
      apiRoute: `${base}${proxyPrefix}${apiRoutePrefix}`,
      assetsRoute: `${base}${proxyPrefix}${assetsRoutePrefix}`,
    };
  };

  private notifySubscriptionsOfStateChange = (): void => {
    const newSnapshot = this.prepareNewStateSnapshot();
    this.snapshotManager.updateSnapshot(newSnapshot);
  };

  // Backstage officially recommends that you use the DiscoveryApi over the
  // ConfigApi nowadays, and that you call it before each request. But the
  // problem is that the Discovery API has no synchronous methods for getting
  // endpoints, meaning that there's no great built-in way to access that data
  // from the UI's render logic. Have to cache the return value to close the gap
  private getProxyEndpoint = async (): Promise<string> => {
    const latestBase = await this.discoveryApi.getBaseUrl('proxy');
    const withProxy = `${latestBase}${this.options.proxyPrefix}`;

    this.latestProxyEndpoint = withProxy;
    this.notifySubscriptionsOfStateChange();

    return withProxy;
  };

  /**
   * @todo 2024-04-11 Update type definition once this PR is finalized:
   * @see {@link https://github.com/coder/coder/pull/12947}
   *
   * Can't make return type readonly, because of an obscure TypeScript edge
   * case. The SDK type for WorkspaceResponse has readonly properties, but the
   * values themselves are mutable, so you can't assign a readonly array to the
   * response type without TS complaining
   */
  private remapWorkspaceUrls = (
    workspaces: readonly Workspace[],
  ): Workspace[] => {
    const { assetsRoute } = this.getStateSnapshot();

    return workspaces.map(ws => {
      const templateIconUrl = ws.template_icon;
      if (!templateIconUrl.startsWith('/')) {
        return ws;
      }

      return {
        ...ws,
        template_icon: `${assetsRoute}${templateIconUrl}`,
      };
    });
  };

  private getWorkspaces: RawCoderSdkApi['getWorkspaces'] = async options => {
    const response = await coderSdkApi.getWorkspaces(options);
    const remapped: WorkspacesResponse = {
      ...response,
      workspaces: this.remapWorkspaceUrls(response.workspaces),
    };

    return remapped;
  };

  private getWorkspacesByRepo = async (
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ): Promise<readonly Workspace[]> => {
    const { workspaces } = await this.sdkApi.getWorkspaces({
      q: coderQuery,
      limit: 0,
    });

    const remappedWorkspaces = this.remapWorkspaceUrls(workspaces);
    const paramResults = await Promise.allSettled(
      remappedWorkspaces.map(ws =>
        this.sdkApi.getWorkspaceBuildParameters(ws.latest_build.id),
      ),
    );

    const matchedWorkspaces: Workspace[] = [];
    for (const [index, res] of paramResults.entries()) {
      if (res.status === 'rejected') {
        continue;
      }

      for (const param of res.value) {
        const include =
          config.repoUrlParamKeys.includes(param.name) &&
          param.value === config.repoUrl;

        if (include) {
          // Doing type assertion just in case noUncheckedIndexedAccess compiler
          // setting ever gets turned on; this shouldn't ever break, but it's
          // technically not type-safe
          matchedWorkspaces.push(workspaces[index] as Workspace);
          break;
        }
      }
    }

    return matchedWorkspaces;
  };

  unsubscribe = (callback: SubscriptionCallback): void => {
    this.snapshotManager.unsubscribe(callback);
  };

  subscribe = (callback: SubscriptionCallback): (() => void) => {
    return this.snapshotManager.subscribe(callback);
  };

  getStateSnapshot = (): CoderClientSnapshot => {
    return this.snapshotManager.getSnapshot();
  };

  validateAuth = async (): Promise<boolean> => {
    const dispatchNewStatus = this.authApi.getAuthValidator();

    try {
      // Dummy request; just need something that all users would have access
      // to, and that doesn't require a body
      await this.sdkApi.getUserLoginType();
      dispatchNewStatus(true);
      return true;
    } catch (err) {
      dispatchNewStatus(false);

      if (!(err instanceof AxiosError)) {
        throw err;
      }

      const response = err.response;
      if (response === undefined) {
        throw new Error('Unable to complete request - unknown error detected.');
      }

      if (response.status >= 400 && response.status !== 401) {
        throw new BackstageHttpError('Failed to complete request', response);
      }
    }

    return false;
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});

export type * as CoderSdkTypes from 'coder/site/src/api/typesGenerated';
