/**
 * @file This class is a little chaotic. It's basically in charge of juggling
 * and coordinating several different systems together:
 *
 * 1. Backstage APIs (API classes/factories, as well as proxies)
 * 2. React (making sure that mutable class state can be turned into immutable
 *    state snapshots that are available synchronously from the first render)
 * 3. The custom auth API(s) that we build out for Backstage
 * 4. The Coder SDK (either the eventual real one, or the fake stopgap)
 * 5. Axios (which we need, because it's what the Coder SDK uses)
 *
 * All while being easy for the end-user to drop into their own Backstage
 * deployment.
 */
import globalAxios, {
  type InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import {
  type DiscoveryApi,
  type IdentityApi,
  createApiRef,
} from '@backstage/core-plugin-api';
import { BackstageHttpError } from './errors';

import type { CoderAuthApi } from './Auth';
import {
  CODER_API_REF_ID_PREFIX,
  Workspace,
  WorkspaceBuildParameter,
} from '../typesConstants';
import { StateSnapshotManager } from '../utils/StateSnapshotManager';
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

/**
 * @todo Replace these type definitions with the full Coder SDK API once we have
 * that built out and ready to import into other projects. Be sure to export out
 * all type definitions from the API under a single namespace, too. (e.g.,
 * export type * as CoderSdkTypes from 'coder-ts-sdk')
 *
 * The types for RawCoderSdkApi should only include functions/values that exist
 * on the current "pseudo-SDK" found in the main coder/coder repo, and that are
 * likely to carry over to the full SDK.
 *
 * @see {@link https://github.com/coder/coder/tree/main/site/src/api}
 */
type WorkspacesRequest = Readonly<{
  after_id?: string;
  limit?: number;
  offset?: number;
  q?: string;
}>;

type WorkspacesResponse = Readonly<{
  workspaces: readonly Workspace[];
  count: number;
}>;

type UserLoginType = Readonly<{
  login_type: '' | 'github' | 'none' | 'oidc' | 'password' | 'token';
}>;

/**
 * This should eventually be the real Coder SDK.
 */
type RawCoderSdkApi = {
  getUserLoginType: () => Promise<UserLoginType>;
  getWorkspaces: (options: WorkspacesRequest) => Promise<WorkspacesResponse>;
  getWorkspaceBuildParameters: (
    input: string,
  ) => Promise<readonly WorkspaceBuildParameter[]>;
};

/**
 * A version of the main Coder SDK API, with additional Backstage-specific
 * methods and properties.
 */
export type BackstageCoderSdkApi = Readonly<
  RawCoderSdkApi & {
    getWorkspacesByRepo: (
      coderQuery: string,
      config: CoderWorkspacesConfig,
    ) => Promise<readonly Workspace[]>;
  }
>;

type SubscriptionCallback = (newSnapshot: CoderClientSnapshot) => void;

export type CoderClientApi = Readonly<{
  sdkApi: BackstageCoderSdkApi;
  isAuthValid: boolean;
  validateAuth: () => Promise<boolean>;

  getStateSnapshot: () => CoderClientSnapshot;
  unsubscribe: (callback: SubscriptionCallback) => void;
  subscribe: (callback: SubscriptionCallback) => () => void;
}>;

/**
 * @todo Using an Axios instance to ensure that even if another user is using
 * Axios, there's no risk of our request intercepting logic messing up non-Coder
 * requests.
 *
 * However, the current version of the SDK does NOT have this behavior. Make
 * sure that it does when it finally gets built out.
 */
const axiosInstance = globalAxios.create();

type CoderClientConstructorInputs = Partial<CoderClientConfigOptions> & {
  apis: Readonly<{
    discoveryApi: DiscoveryApi;
    identityApi: IdentityApi;
    authApi: CoderAuthApi;
  }>;
};

export class CoderClient implements CoderClientApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly authApi: CoderAuthApi;

  private readonly options: CoderClientConfigOptions;
  private readonly snapshotManager: StateSnapshotManager<CoderClientSnapshot>;

  private latestProxyEndpoint: string;
  readonly sdkApi: BackstageCoderSdkApi;

  /* ***************************************************************************
   * There is some funky (but necessary) stuff going on in this class - a lot of
   * the class methods are passed directly to other systems. Just to be on the
   * safe side, all methods (public and private) should be defined as arrow
   * functions, to ensure the methods can't ever lose their `this` contexts
   *
   * This technically defeats some of the memory optimizations you would
   * normally get with class methods (arrow methods will be rebuilt from
   * scratch each time the class is instantiated), but because CoderClient will
   * likely be instantiated only once for the entire app's lifecycle, that won't
   * matter much at all
   ****************************************************************************/

  constructor(inputs: CoderClientConstructorInputs) {
    // The "easy setup" part - initialize internal properties
    const { apis, ...options } = inputs;
    const { discoveryApi, authApi } = apis;

    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.latestProxyEndpoint = '';
    this.options = { ...defaultCoderClientConfigOptions, ...(options ?? {}) };

    /**
     * Wire up API namespace.
     *
     * @todo All methods are defined locally in the class, but this should
     * eventually be updated so that 99% of methods come from the SDK, with a
     * few extra methods patched in for Backstage convenience
     */
    this.sdkApi = {
      getUserLoginType: this.getUserLoginType,
      getWorkspaceBuildParameters: this.getWorkspaceBuildParameters,
      getWorkspaces: this.getWorkspaces,
      getWorkspacesByRepo: this.getWorkspacesByRepo,
    };

    // Wire up Backstage APIs and Axios to be aware of each other
    axiosInstance.interceptors.request.use(this.interceptAxiosRequest);

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

  // Request configs are created on the per-request basis, so mutating a config
  // won't mess up future non-Coder requests that also uses Axios
  private interceptAxiosRequest = async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const { authHeaderKey } = this.options;
    config.baseURL = await this.getProxyEndpoint();
    config.headers[authHeaderKey] = this.authApi.token;
    return config;
  };

  private prepareNewStateSnapshot = (): CoderClientSnapshot => {
    const base = this.latestProxyEndpoint;
    const { apiRoutePrefix, assetsRoutePrefix } = this.options;

    return {
      isAuthValid: this.authApi.isTokenValid,
      apiRoute: `${base}${apiRoutePrefix}`,
      assetsRoute: `${base}${assetsRoutePrefix}`,
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

  private getUserLoginType = async (): Promise<UserLoginType> => {
    const response = await axiosInstance.get<UserLoginType>(
      '/api/v2/users/me/login-type',
    );

    return response.data;
  };

  /**
   * Remaps URLs from the raw API response into proxy-based URLs
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

  private getWorkspaceBuildParameters = async (
    workspaceBuildId: string,
  ): Promise<readonly WorkspaceBuildParameter[]> => {
    const response = await axiosInstance.get<
      readonly WorkspaceBuildParameter[]
    >(`/api/v2/workspacebuilds/${workspaceBuildId}/parameters`);

    return response.data;
  };

  private getWorkspaces = async (
    options: WorkspacesRequest,
  ): Promise<WorkspacesResponse> => {
    const urlParams = new URLSearchParams({
      q: options.q ?? '',
      limit: String(options.limit || 0),
      offset: String(options.offset || 0),
      after_id: options.after_id ?? '',
    });

    const { data } = await axiosInstance.get<WorkspacesResponse>(
      `/workspaces?${urlParams.toString()}`,
    );

    const remapped: WorkspacesResponse = {
      ...data,
      workspaces: this.remapWorkspaceUrls(data.workspaces),
    };

    return remapped;
  };

  private getWorkspacesByRepo = async (
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ): Promise<readonly Workspace[]> => {
    const { workspaces } = await this.getWorkspaces({
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
    const dispatchNewStatus = this.authApi.getAuthStateSetter();

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
