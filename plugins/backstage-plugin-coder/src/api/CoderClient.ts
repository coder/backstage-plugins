import globalAxios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig as RequestConfig,
} from 'axios';
import { type IdentityApi, createApiRef } from '@backstage/core-plugin-api';
import { type Workspace, CODER_API_REF_ID_PREFIX } from '../typesConstants';
import type { UrlSync } from './UrlSync';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { CoderSdk } from './MockCoderSdk';

export const CODER_AUTH_HEADER_KEY = 'Coder-Session-Token';
const REQUEST_TIMEOUT_MS = 20_000;

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

const sharedCleanupAbortReason = new DOMException(
  'Coder Client instance has been manually cleaned up',
  'AbortError',
);

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

  private trackedEjectionIds: Set<number>;
  private loadedSessionToken: string | undefined;
  readonly sdk: BackstageCoderSdk;

  constructor(inputs: ConstructorInputs) {
    const { apis } = inputs;
    const { urlSync, identityApi } = apis;

    this.urlSync = urlSync;
    this.identityApi = identityApi;
    this.loadedSessionToken = undefined;
    this.cleanupController = new AbortController();
    this.trackedEjectionIds = new Set();

    this.axios = globalAxios.create();
    this.sdk = this.getBackstageCoderSdk(this.axios);
    this.addBaseRequestInterceptors();
  }

  private addRequestInterceptor(
    requestInterceptor: (
      config: RequestConfig,
    ) => RequestConfig | Promise<RequestConfig>,
    errorInterceptor?: (error: unknown) => unknown,
  ): number {
    const ejectionId = this.axios.interceptors.request.use(
      requestInterceptor,
      errorInterceptor,
    );

    this.trackedEjectionIds.add(ejectionId);
    return ejectionId;
  }

  private removeRequestInterceptorById(ejectionId: number): boolean {
    const sizeBeforeRemoval = this.trackedEjectionIds.size;

    this.axios.interceptors.request.eject(ejectionId);
    if (this.trackedEjectionIds.has(ejectionId)) {
      this.trackedEjectionIds.delete(ejectionId);
    }

    return sizeBeforeRemoval !== this.trackedEjectionIds.size;
  }

  private addBaseRequestInterceptors(): void {
    // Configs exist on a per-request basis; mutating the config for a new
    // request won't mutate any configs for requests that are currently pending
    const baseRequestInterceptor = async (
      config: RequestConfig,
    ): Promise<RequestConfig> => {
      // Front-load the setup steps that rely on external APIs, so that if any
      // fail, the request bails out early before modifying the config
      const proxyApiEndpoint = await this.urlSync.getApiEndpoint();
      const bearerToken = (await this.identityApi.getCredentials()).token;

      config.baseURL = proxyApiEndpoint;
      config.signal = this.getTimeoutAbortSignal();

      // The Axios docs have incredibly confusing wording about how multiple
      // interceptors work. They say the interceptors are "run in the order
      // added", implying that the first interceptor you add will always run
      // first. That is not true - they're run in reverse order, so the newer
      // interceptors will always run before anything else. Only add token from
      // this base interceptor if a newer interceptor hasn't already added one
      if (config.headers[CODER_AUTH_HEADER_KEY] === undefined) {
        config.headers[CODER_AUTH_HEADER_KEY] = this.loadedSessionToken;
      }

      if (bearerToken) {
        config.headers.Authorization = `Bearer ${bearerToken}`;
      }

      return config;
    };

    const baseErrorInterceptor = (error: unknown): unknown => {
      const errorIsFromCleanup =
        error instanceof DOMException &&
        error.name === sharedCleanupAbortReason.name &&
        error.message === sharedCleanupAbortReason.message;

      // Manually aborting a request is always treated as an error, even if we
      // 100% expect it. Just scrub the error if it's from the cleanup
      if (errorIsFromCleanup) {
        return undefined;
      }

      return error;
    };

    this.addRequestInterceptor(baseRequestInterceptor, baseErrorInterceptor);
  }

  private getBackstageCoderSdk(
    axiosInstance: AxiosInstance,
  ): BackstageCoderSdk {
    const baseSdk = new CoderSdk(axiosInstance);

    const originalGetWorkspaces = baseSdk.getWorkspaces;
    baseSdk.getWorkspaces = async request => {
      const workspacesRes = await originalGetWorkspaces(request);
      const remapped = await this.remapWorkspaceIconUrls(
        workspacesRes.workspaces,
      );

      return {
        count: remapped.length,
        workspaces: remapped,
      };
    };

    const getWorkspacesByRepo = async (
      coderQuery: string,
      config: CoderWorkspacesConfig,
    ): Promise<readonly Workspace[]> => {
      const { workspaces } = await baseSdk.getWorkspaces({
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
      ...baseSdk,
      getWorkspacesByRepo,
    };
  }

  /**
   * Creates a combined abort signal that will abort when the client is cleaned
   * up, but will also enforce request timeouts
   */
  private getTimeoutAbortSignal(): AbortSignal {
    // AbortSignal.any would do exactly what we need to, but it's too new for
    // certain browsers to be reliable. Have to wire everything up manually
    const timeoutController = new AbortController();

    const timeoutId = window.setTimeout(() => {
      const reason = new DOMException('Signal timed out', 'TimeoutException');
      timeoutController.abort(reason);
    }, REQUEST_TIMEOUT_MS);

    const cleanupSignal = this.cleanupController.signal;
    cleanupSignal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeoutId);
        timeoutController.abort(cleanupSignal.reason);
      },

      // Attaching the timeoutController signal here makes it so that if the
      // timeout resolves, this event listener will automatically be removed
      { signal: timeoutController.signal },
    );

    return timeoutController.signal;
  }

  private async remapWorkspaceIconUrls(
    workspaces: readonly Workspace[],
  ): Promise<Workspace[]> {
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
    // Because this newly-added interceptor will run before any other
    // interceptors, you could make it so that the syncToken request will
    // disable all other requests while validating. Chose not to do that because
    // of React Query background re-fetches. As long as the new token is valid,
    // they won't notice any difference at all, even though the token will have
    // suddenly changed out from under them
    const validationId = this.addRequestInterceptor(config => {
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
      // Logic in a finally block always executes even after a value is returned
      this.removeRequestInterceptorById(validationId);
    }
  };

  cleanupClient = (): void => {
    this.trackedEjectionIds.forEach(id => {
      this.axios.interceptors.request.eject(id);
    });

    this.trackedEjectionIds.clear();
    this.cleanupController.abort(sharedCleanupAbortReason);
    this.loadedSessionToken = undefined;
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});
