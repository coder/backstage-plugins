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
  type UserLoginType,
  type Workspace,
  type WorkspaceBuildParameter,
  type WorkspacesRequest,
  type WorkspacesResponse,
  CODER_API_REF_ID_PREFIX,
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
 * @todo This should eventually be the real Coder SDK.
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
  cleanupClient: () => void;
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
    identityApi: IdentityApi;
    discoveryApi: DiscoveryApi;
    authApi: CoderAuthApi;
  }>;
};

export class CoderClient implements CoderClientApi {
  private readonly identityApi: IdentityApi;
  private readonly discoveryApi: DiscoveryApi;
  private readonly authApi: CoderAuthApi;

  private readonly options: CoderClientConfigOptions;
  private readonly snapshotManager: StateSnapshotManager<CoderClientSnapshot>;
  private readonly axiosInterceptorId: number;
  private readonly abortController: AbortController;

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
    const { apis, ...options } = inputs;
    const { discoveryApi, identityApi, authApi } = apis;

    // The "easy setup" part - initialize internal properties
    this.identityApi = identityApi;
    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.latestProxyEndpoint = '';
    this.options = { ...defaultCoderClientConfigOptions, ...options };

    /**
     * Wire up SDK API namespace.
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
    this.abortController = new AbortController();
    this.axiosInterceptorId = axiosInstance.interceptors.request.use(
      this.interceptAxiosRequest,
    );

    // Hook up snapshot manager so that external systems can be made aware when
    // state changes, all in a render-safe way
    this.snapshotManager = new StateSnapshotManager({
      initialSnapshot: this.prepareNewStateSnapshot(),
    });

    // Set up logic for syncing client snapshots to auth state changes
    this.authApi.subscribe(newAuthSnapshot => {
      const latestClientSnapshot = this.getStateSnapshot();
      if (newAuthSnapshot.isTokenValid !== latestClientSnapshot.isAuthValid) {
        this.notifySubscriptionsOfStateChange();
      }
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
    const { authHeaderKey, apiRoutePrefix } = this.options;

    const proxyEndpoint = await this.getProxyEndpoint();
    config.baseURL = `${proxyEndpoint}${apiRoutePrefix}`;
    config.signal = this.abortController.signal;
    config.headers[authHeaderKey] = this.authApi.requestToken() ?? undefined;

    const bearerToken = (await this.identityApi.getCredentials()).token;
    if (bearerToken) {
      config.headers.Authorization = `Bearer ${bearerToken}`;
    }

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
      '/users/me/login-type',
    );

    return response.data;
  };

  private remapWorkspaceIconUrls = (
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
    >(`/workspacebuilds/${workspaceBuildId}/parameters`);

    return response.data;
  };

  private getWorkspaces = async (
    options: WorkspacesRequest,
  ): Promise<WorkspacesResponse> => {
    const urlParams = new URLSearchParams({
      q: options.q ?? '',
      limit: String(options.limit || 0),
    });

    const { data } = await axiosInstance.get<WorkspacesResponse>(
      `/workspaces?${urlParams.toString()}`,
    );

    const remapped: WorkspacesResponse = {
      ...data,
      workspaces: this.remapWorkspaceIconUrls(data.workspaces),
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

    const remappedWorkspaces = this.remapWorkspaceIconUrls(workspaces);
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
        throw new Error(
          'Unable to complete Axios request - no Axios response to reference',
        );
      }

      if (response.status >= 400 && response.status !== 401) {
        throw new BackstageHttpError('Failed to complete request', response);
      }
    }

    return false;
  };

  cleanupClient = () => {
    this.abortController.abort();
    axiosInstance.interceptors.request.eject(this.axiosInterceptorId);
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});
