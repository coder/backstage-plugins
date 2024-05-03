import globalAxios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig as RequestConfig,
} from 'axios';
import { type IdentityApi, createApiRef } from '@backstage/core-plugin-api';
import {
  type Workspace,
  CODER_API_REF_ID_PREFIX,
  WorkspacesRequest,
  WorkspacesResponse,
  User,
} from '../typesConstants';
import type { UrlSync } from './UrlSync';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { CoderSdk } from './MockCoderSdk';

export const CODER_AUTH_HEADER_KEY = 'Coder-Session-Token';
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

/**
 * A version of the main Coder SDK API, with additional Backstage-specific
 * methods and properties.
 */
export type BackstageCoderSdk = Readonly<
  CoderSdk & {
    getWorkspacesByRepo: (
      request: WorkspacesRequest,
      config: CoderWorkspacesConfig,
    ) => Promise<WorkspacesResponse>;
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

// Can't make this value readonly at the type level because it has
// non-enumerable properties, and Object.freeze causes errors. Just have to
// treat this like a constant
export const disabledClientError = new Error(
  'Requests have been disabled for this client. Please create a new client',
);

type ConstructorInputs = Readonly<{
  initialToken?: string;
  requestTimeoutMs?: number;

  apis: Readonly<{
    urlSync: UrlSync;
    identityApi: IdentityApi;
  }>;
}>;

export class CoderClient implements CoderClientApi {
  private readonly urlSync: UrlSync;
  private readonly identityApi: IdentityApi;
  private readonly axios: AxiosInstance;

  private readonly requestTimeoutMs: number;
  private readonly cleanupController: AbortController;
  private readonly trackedEjectionIds: Set<number>;

  private loadedSessionToken: string | undefined;
  readonly sdk: BackstageCoderSdk;

  constructor(inputs: ConstructorInputs) {
    const {
      apis,
      initialToken,
      requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    } = inputs;
    const { urlSync, identityApi } = apis;

    this.urlSync = urlSync;
    this.identityApi = identityApi;
    this.axios = globalAxios.create();

    this.loadedSessionToken = initialToken;
    this.requestTimeoutMs = requestTimeoutMs;

    this.cleanupController = new AbortController();
    this.trackedEjectionIds = new Set();

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
    // Even if we somehow pass in an ID that hasn't been associated with the
    // Axios instance, that's a noop. No harm in calling method no matter what
    this.axios.interceptors.request.eject(ejectionId);

    if (!this.trackedEjectionIds.has(ejectionId)) {
      return false;
    }

    this.trackedEjectionIds.delete(ejectionId);
    return true;
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

    const getWorkspaces: (typeof baseSdk)['getWorkspaces'] = async request => {
      const workspacesRes = await baseSdk.getWorkspaces(request);
      const remapped = await this.remapWorkspaceIconUrls(
        workspacesRes.workspaces,
      );

      return {
        ...workspacesRes,
        workspaces: remapped,
      };
    };

    const getWorkspacesByRepo = async (
      request: WorkspacesRequest,
      config: CoderWorkspacesConfig,
    ): Promise<WorkspacesResponse> => {
      if (config.repoUrl === undefined) {
        return { workspaces: [], count: 0 };
      }

      // Have to store value here so that type information doesn't degrade
      // back to (string | undefined) inside the .map callback
      const stringUrl = config.repoUrl;
      const responses = await Promise.allSettled(
        config.repoUrlParamKeys.map(key => {
          const patchedRequest = {
            ...request,
            q: appendParamToQuery(request.q, key, stringUrl),
          };

          return baseSdk.getWorkspaces(patchedRequest);
        }),
      );

      const uniqueWorkspaces = new Map<string, Workspace>();
      for (const res of responses) {
        if (res.status === 'rejected') {
          continue;
        }

        for (const workspace of res.value.workspaces) {
          uniqueWorkspaces.set(workspace.id, workspace);
        }
      }

      const serialized = [...uniqueWorkspaces.values()];
      return {
        workspaces: serialized,
        count: serialized.length,
      };
    };

    return {
      ...baseSdk,
      getWorkspaces,
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
    }, this.requestTimeoutMs);

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

  /* ***************************************************************************
   * All public functions should be defined as arrow functions to ensure they
   * can be passed around React without risk of losing their `this` context
   ****************************************************************************/

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
      const dummyUser = await this.sdk.getAuthenticatedUser();

      // Most of the time, we're going to trust the types returned back from the
      // server without doing any type-checking, but because this request does
      // deal with auth, we're going to do some extra validation steps
      assertValidUser(dummyUser);

      this.loadedSessionToken = newToken;
      return true;
    } catch (err) {
      const tokenIsInvalid =
        err instanceof AxiosError && err.response?.status === 401;
      if (tokenIsInvalid) {
        return false;
      }

      throw err;
    } finally {
      // Logic in finally blocks always run, even after the function has
      // returned a value or thrown an error
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

    // Not using this.addRequestInterceptor, because we don't want to track this
    // interceptor at all. It should never be ejected once the client has been
    // disabled
    this.axios.interceptors.request.use(() => {
      throw disabledClientError;
    });
  };
}

function appendParamToQuery(
  query: string | undefined,
  key: string,
  value: string,
): string {
  if (!key || !value) {
    return '';
  }

  const keyValuePair = `param:"${key}=${value}"`;
  if (!query) {
    return keyValuePair;
  }

  if (query.includes(keyValuePair)) {
    return query;
  }

  return `${query} ${keyValuePair}`;
}

function assertValidUser(value: unknown): asserts value is User {
  if (value === null || typeof value !== 'object') {
    throw new Error('Returned JSON value is not an object');
  }

  const hasFields =
    'id' in value &&
    typeof value.id === 'string' &&
    'username' in value &&
    typeof value.username === 'string';

  if (!hasFields) {
    throw new Error(
      'User object is missing expected fields for authentication request',
    );
  }
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});
