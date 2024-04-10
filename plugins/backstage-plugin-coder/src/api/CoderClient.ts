import axios, { AxiosError } from 'axios';
import * as coderSdkApi from 'coder/site/src/api/api';
import { DiscoveryApi, createApiRef } from '@backstage/core-plugin-api';
import { BackstageHttpError } from './errors';

import type { CoderAuthApi } from './Auth';
import { CODER_API_REF_ID_PREFIX } from '../typesConstants';
import { StateSnapshotManager } from '../utils/StateSnapshotManager';
import type { Workspace } from 'coder/site/src/api/typesGenerated';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';

type CoderClientConfigOptions = Readonly<{
  apiRoutePrefix: string;
  authHeaderKey: string;
  assetsRoutePrefix: string;
  requestTimeoutMs: number;
}>;

export const defaultCoderClientConfigOptions = {
  apiRoutePrefix: '/coder/api/v2',
  assetsRoutePrefix: '/coder',
  authHeaderKey: 'Coder-Session-Token',
  requestTimeoutMs: 20_000,
} as const satisfies CoderClientConfigOptions;

export type CoderClientSnapshot = Readonly<{
  isAuthValid: boolean;
  apiRoute: string;
  assetsRoute: string;
}>;

export type CoderApiNamespace = Readonly<
  typeof coderSdkApi & {
    getWorkspacesByRepo: (
      coderQuery: string,
      config: CoderWorkspacesConfig,
    ) => Promise<readonly Workspace[]>;
  }
>;

type SubscriptionCallback = (newSnapshot: CoderClientSnapshot) => void;

export type CoderClientApi = Readonly<{
  api: CoderApiNamespace;
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

  private latestBaseEndpoint: string;
  readonly api: CoderApiNamespace;

  constructor(
    discoveryApi: DiscoveryApi,
    authApi: CoderAuthApi,
    options?: Partial<CoderClientConfigOptions>,
  ) {
    // Instantiate config properties via constructor's function signature
    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.latestBaseEndpoint = '';
    this.options = { ...defaultCoderClientConfigOptions, ...(options ?? {}) };

    // Wire up API namespace and patch in additional function(s) for end-user
    // convenience. Cannot inline function definitions inside this.api
    // assignment because of funky JavaScript `this` rules
    const getWorkspacesByRepo: typeof this.getWorkspacesByRepo = (
      coderQuery,
      config,
    ) => this.getWorkspacesByRepo(coderQuery, config);
    this.api = { ...coderSdkApi, getWorkspacesByRepo };

    // Wire up Backstage APIs to be aware of Axios, and keep it aware of the
    // most up-to-date state
    axios.interceptors.request.use(async config => {
      config.baseURL = await this.getBaseProxyEndpoint();
      config.headers[this.options.authHeaderKey] = this.authApi.token;
      return config;
    });

    // Call DiscoveryApi to populate initial endpoint path, so that the path
    // can be accessed synchronously from the UI
    void this.getBaseProxyEndpoint();

    // Hook up snapshot manager so that external systems can be made aware when
    // state changes in a render-safe way
    this.snapshotManager = new StateSnapshotManager({
      initialSnapshot: this.prepareNewSnapshot(),
    });
  }

  get isAuthValid(): boolean {
    return this.authApi.isTokenValid;
  }

  private prepareNewSnapshot(): CoderClientSnapshot {
    const { apiRoutePrefix, assetsRoutePrefix } = this.options;
    return {
      isAuthValid: this.authApi.isTokenValid,
      apiRoute: `${this.latestBaseEndpoint}${apiRoutePrefix}`,
      assetsRoute: `${this.latestBaseEndpoint}${assetsRoutePrefix}`,
    };
  }

  private notifySubscriptions(): void {
    const newSnapshot = this.prepareNewSnapshot();
    this.snapshotManager.updateSnapshot(newSnapshot);
  }

  // Backstage officially recommends that you use the DiscoveryApi over the
  // ConfigApi nowadays, and that you call it before each request. But the
  // problem is that the Discovery API has no synchronous methods for getting
  // endpoints, meaning that there's no great built-in way to access that data
  // synchronously. Have to cache the return value for UI logic
  private async getBaseProxyEndpoint(): Promise<string> {
    const latestBase = await this.discoveryApi.getBaseUrl('proxy');
    this.latestBaseEndpoint = latestBase;
    this.notifySubscriptions();

    return latestBase;
  }

  private remapWorkspaceUrls(
    workspaces: readonly Workspace[],
  ): readonly Workspace[] {
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
  }

  private async getWorkspacesByRepo(
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ): Promise<readonly Workspace[]> {
    const { workspaces } = await this.api.getWorkspaces({
      q: coderQuery,
      limit: 0,
    });

    const remappedWorkspaces = this.remapWorkspaceUrls(workspaces);
    const paramResults = await Promise.allSettled(
      remappedWorkspaces.map(ws =>
        this.api.getWorkspaceBuildParameters(ws.latest_build.id),
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
  }

  /* ***************************************************************************
   * All public functions should be defined as arrow functions to ensure they
   * can be passed around React without risk of losing their "this" context
   ****************************************************************************/

  validateAuth = (): Promise<boolean> => {
    return this.authApi.validateAuth(async () => {
      try {
        // Dummy request; just need something that all users would have access
        // to, and that doesn't require a body
        await this.api.getUserLoginType();
        return true;
      } catch (err) {
        this.notifySubscriptions();

        if (!(err instanceof AxiosError)) {
          throw err;
        }

        const response = err.response;
        if (response === undefined) {
          throw new Error(
            'Unable to complete request - unknown error detected.',
          );
        }

        if (response.status >= 400 && response.status !== 401) {
          throw new BackstageHttpError('Failed to complete request', response);
        }
      }

      return false;
    });
  };

  getStateSnapshot = (): CoderClientSnapshot => {
    return this.snapshotManager.getSnapshot();
  };

  unsubscribe = (callback: SubscriptionCallback): void => {
    this.snapshotManager.unsubscribe(callback);
  };

  subscribe = (callback: SubscriptionCallback): (() => void) => {
    return this.snapshotManager.subscribe(callback);
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});

export type * as CoderSdkTypes from 'coder/site/src/api/typesGenerated';
