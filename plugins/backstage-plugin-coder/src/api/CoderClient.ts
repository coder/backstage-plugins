import globalAxios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { type IdentityApi, createApiRef } from '@backstage/core-plugin-api';
import {
  type Workspace,
  type WorkspaceBuildParameter,
  type WorkspacesResponse,
  CODER_API_REF_ID_PREFIX,
} from '../typesConstants';
import type { UrlSync } from './UrlSync';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';

export const CODER_AUTH_HEADER_KEY = 'Coder-Session-Token';
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * This is a temporary (and significantly limited) implementation of the "Coder
 * SDK" type that will eventually be imported from Coder core
 *
 * @todo Replace this with a full, proper implementation, and then expose it to
 * plugin users.
 */
type CoderSdk = Readonly<{
  getUserLoginType: () => Promise<UserLoginType>;
  getWorkspaces: (options: WorkspacesRequest) => Promise<WorkspacesResponse>;
  getWorkspaceBuildParameters: (
    workspaceBuildId: string,
  ) => Promise<readonly WorkspaceBuildParameter[]>;
}>;

type WorkspacesRequest = Readonly<{
  after_id?: string;
  limit?: number;
  offset?: number;
  q?: string;
}>;

// Return value used for the dummy requests used to verify a user's auth status
// for the Coder token auth logic
type UserLoginType = Readonly<{
  login_type: '' | 'github' | 'none' | 'oidc' | 'password' | 'token';
}>;

/**
 * A version of the main Coder SDK API, with additional Backstage-specific
 * methods and properties.
 */
export type BackstageCoderSdk = Readonly<
  CoderSdk & {
    getWorkspacesByRepo: (
      coderQuery: string,
      config: CoderWorkspacesConfig,
    ) => Promise<readonly Workspace[]>;
  }
>;

type SetupAxiosResult = Readonly<{
  axios: AxiosInstance;
  ejectId: number;
}>;

type CoderClientApi = Readonly<{
  sdk: BackstageCoderSdk;

  /**
   * Validates a new token, and loads it only if it is valid.
   * Return value indicates whether the token is valid.
   */
  syncToken: (newToken: string) => Promise<boolean>;

  /**
   * Cleans up a client instance, removing its links to all external systems.
   */
  cleanupClient: () => void;
}>;

type ConstructorInputs = Readonly<{
  apis: Readonly<{
    urlSync: UrlSync;
    identityApi: IdentityApi;
  }>;
}>;

export class CoderClient implements CoderClientApi {
  private readonly urlSync: UrlSync;
  private readonly identityApi: IdentityApi;

  private readonly axios: AxiosInstance;
  private readonly axiosEjectId: number;
  private readonly cleanupController: AbortController;

  private disabled: boolean;
  private loadedSessionToken: string | undefined;
  readonly sdk: BackstageCoderSdk;

  constructor(inputs: ConstructorInputs) {
    const { apis } = inputs;
    const { urlSync, identityApi } = apis;

    this.urlSync = urlSync;
    this.identityApi = identityApi;
    this.loadedSessionToken = undefined;
    this.disabled = false;

    const { axios, ejectId } = this.setupAxiosInstance();
    this.axios = axios;
    this.axiosEjectId = ejectId;

    this.sdk = this.getBackstageCoderSdk(axios);
    this.cleanupController = new AbortController();
  }

  private setupAxiosInstance(): SetupAxiosResult {
    const axios = globalAxios.create();

    // Configs exist on a per-request basis; mutating the config for a new
    // request won't mutate any configs for requests that are currently pending
    const interceptAxiosRequest = async (
      config: InternalAxiosRequestConfig,
    ): Promise<InternalAxiosRequestConfig> => {
      if (this.disabled) {
        throw new Error(
          'Received new request for client that has already been cleaned up',
        );
      }

      // Front-load the setup steps that rely on external APIs, so that if any
      // fail, the request bails out early
      const proxyApiEndpoint = await this.urlSync.getApiEndpoint();
      const bearerToken = (await this.identityApi.getCredentials()).token;

      config.baseURL = proxyApiEndpoint;
      config.signal = this.getTimeoutAbortSignal();
      config.headers[CODER_AUTH_HEADER_KEY] = this.loadedSessionToken;

      if (bearerToken) {
        config.headers.Authorization = `Bearer ${bearerToken}`;
      }

      return config;
    };

    const interceptAxiosError = (error: unknown): unknown => {
      const errorIsFromCleanup = error instanceof DOMException;
      if (errorIsFromCleanup) {
        return undefined;
      }

      return error;
    };

    const ejectId = axios.interceptors.request.use(
      interceptAxiosRequest,
      interceptAxiosError,
    );

    return { axios, ejectId };
  }

  private getBackstageCoderSdk(
    axiosInstance: AxiosInstance,
  ): BackstageCoderSdk {
    // Defining all the SDK functions here instead of in the class as private
    // methods to limit the amount of noise you get from intellisense
    const getWorkspaces = async (
      request: WorkspacesRequest,
    ): Promise<WorkspacesResponse> => {
      const urlParams = new URLSearchParams({
        q: request.q ?? '',
        limit: String(request.limit || 0),
        after_id: request.after_id ?? '',
        offset: String(request.offset || 0),
      });

      const { data } = await axiosInstance.get<WorkspacesResponse>(
        `/workspaces?${urlParams.toString()}`,
      );

      const remapped = await this.remapWorkspaceIconUrls(data.workspaces);
      return {
        count: data.count,
        workspaces: remapped as Workspace[],
      };
    };

    const getWorkspaceBuildParameters = async (
      workspaceBuildId: string,
    ): Promise<readonly WorkspaceBuildParameter[]> => {
      const response = await axiosInstance.get<
        readonly WorkspaceBuildParameter[]
      >(`/workspacebuilds/${workspaceBuildId}/parameters`);

      return response.data;
    };

    const getUserLoginType = async (): Promise<UserLoginType> => {
      const response = await axiosInstance.get<UserLoginType>(
        '/users/me/login-type',
      );

      return response.data;
    };

    const getWorkspacesByRepo = async (
      coderQuery: string,
      config: CoderWorkspacesConfig,
    ): Promise<readonly Workspace[]> => {
      const { workspaces } = await getWorkspaces({
        q: coderQuery,
        limit: 0,
      });

      const paramResults = await Promise.allSettled(
        workspaces.map(ws =>
          this.sdk.getWorkspaceBuildParameters(ws.latest_build.id),
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
            // Doing type assertion just in case noUncheckedIndexedAccess
            // compiler setting ever gets turned on; this shouldn't ever break,
            // but it's technically not type-safe
            matchedWorkspaces.push(workspaces[index] as Workspace);
            break;
          }
        }
      }

      return matchedWorkspaces;
    };

    return {
      getWorkspaces,
      getWorkspaceBuildParameters,
      getUserLoginType,
      getWorkspacesByRepo,
    };
  }

  /**
   * Creates a combined abort signal that will abort when the client is cleaned
   * up, but also enforces request timeouts
   */
  private getTimeoutAbortSignal(): AbortSignal {
    // AbortSignal.any would do exactly what we need to, but it's too new for
    // certain browsers to be reliable. Have to wire everything up manually
    const timeoutController = new AbortController();
    window.setTimeout(() => {
      const reason = new DOMException('Signal timed out', 'TimeoutException');
      timeoutController.abort(reason);
    }, REQUEST_TIMEOUT_MS);

    const cleanupSignal = this.cleanupController.signal;
    cleanupSignal.addEventListener('abort', () => {
      timeoutController.abort(cleanupSignal.reason);
    });

    return timeoutController.signal;
  }

  private async remapWorkspaceIconUrls(
    workspaces: readonly Workspace[],
  ): Promise<readonly Workspace[]> {
    const assetsRoute = await this.urlSync.getAssetsEndpoint();

    return workspaces.map<Workspace>(ws => {
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

  syncToken = async (newToken: string): Promise<boolean> => {
    // This is very silly, but just to ensure that the config options for the
    // token validation request can't conflict with the Axios instance made
    // during instantiation, we're making a brand-new SDK + Axios instance just
    // for the lifecycle of this method
    const { axios: tempAxiosInstance } = this.setupAxiosInstance();
    tempAxiosInstance.interceptors.request.use(config => {
      config.headers[CODER_AUTH_HEADER_KEY] = newToken;
      return config;
    });

    try {
      // Actual request type doesn't matter; just need to make some kind of
      // dummy request. Should favor requests that all users have access to and
      // that don't require request bodies
      const sdkForToken = this.getBackstageCoderSdk(tempAxiosInstance);
      await sdkForToken.getUserLoginType();
      this.loadedSessionToken = newToken;
      return true;
    } catch {
      return false;
    }
  };

  cleanupClient = (): void => {
    this.disabled = true;
    this.axios.interceptors.request.eject(this.axiosEjectId);
    this.cleanupController.abort();
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});
