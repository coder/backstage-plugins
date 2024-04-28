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
  private readonly cleanupController: AbortController;

  private axiosEjectId: number;
  private loadedSessionToken: string | undefined;
  readonly sdk: BackstageCoderSdk;

  constructor(inputs: ConstructorInputs) {
    const { apis } = inputs;
    const { urlSync, identityApi } = apis;

    this.urlSync = urlSync;
    this.identityApi = identityApi;
    this.loadedSessionToken = undefined;

    const axios = globalAxios.create();
    const ejectId = this.addInterceptors(axios);
    this.axios = axios;
    this.axiosEjectId = ejectId;

    this.sdk = this.getBackstageCoderSdk(axios);
    this.cleanupController = new AbortController();
  }

  private addInterceptors(axios: AxiosInstance): number {
    // Configs exist on a per-request basis; mutating the config for a new
    // request won't mutate any configs for requests that are currently pending
    const interceptAxiosRequest = async (
      config: InternalAxiosRequestConfig,
    ): Promise<InternalAxiosRequestConfig> => {
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

    return ejectId;
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
    /**
     * This logic requires a long explanation if you aren't familiar with
     * the intricacies of JavaScript. Tried other options, but this seemed like
     * the best approach.
     *
     * 1. interceptors.request.use will synchronously add a new interceptor
     *    function to the axios instance. Axios interceptors are always applied
     *    in the order they're added; there is no easy way to add a new
     *    interceptor that will run before what's already been added
     * 2. When we make the request in syncToken, we will pause the thread of
     *    execution when we hit the await keyword. This means that while this
     *    function call is paused, the interceptor will apply to every single
     *    request until the syncToken request comes back
     * 3. Because of how React Query background re-fetches work, there might be
     *    other requests that were already queued before syncToken got called,
     *    and that will go through the new interceptor in the meantime
     * 4. As long as the new token is valid, those requests shouldn't notice any
     *    difference, but if the new token is invalid, they will start failing
     * 5. The interceptor doesn't get removed until the syncToken request
     *    finishes (whether it succeeds or not)
     * 6. Thanks to closure, the value of newToken is made available to all
     *    requests indirectly, so there also isn't a good way to uniquely
     *    identify the syncToken request.
     *
     * Tried to figure out a way to make it so that all requests other than the
     * syncToken request would be disabled. But the only surefire way to ensure
     * no collisions was making a new Axios instance + Coder SDK instance just
     * for the lifetime of the syncToken request, which seemed excessive
     */
    const ejectValidationId = this.axios.interceptors.request.use(config => {
      config.headers[CODER_AUTH_HEADER_KEY] = newToken;
      return config;
    });

    try {
      // Actual request type doesn't matter; just need to make some kind of
      // dummy request. Should favor requests that all users have access to and
      // that don't require request bodies
      await this.sdk.getUserLoginType();
      this.loadedSessionToken = newToken;
      return true;
    } catch {
      return false;
    } finally {
      // Finally blocks always execute even after a value is returned
      this.axios.interceptors.request.eject(ejectValidationId);
    }
  };

  cleanupClient = (): void => {
    this.axios.interceptors.request.eject(this.axiosEjectId);
    this.cleanupController.abort();
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});
