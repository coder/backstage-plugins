import { DiscoveryApi, createApiRef, useApi } from '@backstage/core-plugin-api';
import { BackstageHttpError } from './errors';
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { CODER_QUERY_KEY_PREFIX } from './queryOptions';
import { getCoderApiRequestInit } from './CoderClient';

export type CoderAuthOptions = {
  tokenStorageKey: string;
  localStorage: typeof window.localStorage;

  // Handles auth edge case where a previously-valid token can't be verified.
  // Not immediately removing token to provide better UX in case someone's
  // internet disconnects for a few seconds
  gracePeriodTimeoutMs: number;
};

const defaultConfigOptions = {
  tokenStorageKey: 'coder-backstage-plugin/token',
  localStorage: window.localStorage,
  gracePeriodTimeoutMs: 6_000,
} as const satisfies CoderAuthOptions;

type AuthStatus = Readonly<
  | {
      status: 'initializing' | 'tokenMissing';
      token: undefined;
      error: undefined;
    }
  | {
      status: 'authenticated' | 'distrustedWithGracePeriod';
      token: string;
      error: undefined;
    }
  | {
      // Distrusted represents a token that could be valid, but we are unable
      // to verify it within an allowed window. invalid is definitely, 100%
      // invalid
      status:
        | 'authenticating'
        | 'invalid'
        | 'distrusted'
        | 'noInternetConnection'
        | 'deploymentUnavailable';
      token: undefined;
      error: unknown;
    }
>;

export type CoderAuthStatus = AuthStatus['status'];
type ValidAuthStatus = Extract<
  AuthStatus,
  { status: 'authenticated' | 'distrustedWithGracePeriod' }
>;

const validStatuses: readonly CoderAuthStatus[] = [
  'authenticated',
  'distrustedWithGracePeriod',
];

export class CoderAuth {
  private readonly discoveryApi: DiscoveryApi;
  private readonly configOptions: CoderAuthOptions;
  private readonly initialAuthToken: string;

  private authToken: string;
  private renderState: AuthRenderState;
  private isInsideGracePeriod: boolean;

  constructor(discoveryApi: DiscoveryApi, options?: Partial<CoderAuthOptions>) {
    this.discoveryApi = discoveryApi;
    this.configOptions = { ...defaultConfigOptions, ...(options ?? {}) };

    this.initialAuthToken = this.readTokenFromLocalStorage();
    this.authToken = this.initialAuthToken;
    this.isInsideGracePeriod = Boolean(this.initialAuthToken);
  }

  static assertValidRenderState(
    state: AuthRenderState,
  ): asserts state is ValidAuthStatus {
    if (!validStatuses.includes(state.status)) {
      throw new Error('Auth token is not currently valid');
    }
  }

  get token() {
    return this.authToken;
  }

  private async getApiEndpoint(): Promise<string> {
    const proxyUrlBase = await this.discoveryApi.getBaseUrl('proxy');
    return `${proxyUrlBase}${this.initOptions.apiPath}`;
  }

  // All public instanced class methods should be defined as arrow functions to
  // ensure that they can't lose their "this" context when passed around as
  // values

  isAuthValid = async (): Promise<boolean> => {
    const endpoint = await this.getApiEndpoint();

    // In this case, the request doesn't actually matter. Just need to make any
    // kind of dummy request to validate the auth
    const response = await fetch(
      `${endpoint}/users/me`,
      getCoderApiRequestInit(this.authToken),
    );

    if (response.status >= 400 && response.status !== 401) {
      throw new BackstageHttpError('Failed to complete request', response);
    }

    return response.status !== 401;
  };

  getAuthStatus = async (): Promise<AuthStatus> => {
    // Blah blah
  };

  readTokenFromLocalStorage = (): string => {
    return (
      window.localStorage.getItem(this.configOptions.tokenStorageKey) ?? ''
    );
  };

  writeTokenToLocalStorage = (): boolean => {
    if (this.renderState.status !== 'authenticated') {
      return false;
    }

    try {
      this.configOptions.localStorage.setItem(
        this.configOptions.tokenStorageKey,
        this.renderState.token,
      );
    } catch {
      return false;
    }

    return true;
  };

  clearAuthToken = (): void => {
    window.localStorage.removeItem(this.configOptions.tokenStorageKey);
    setAuthToken('');
  };

  processDistrustedToken = (): undefined | (() => void) => {
    if (this.renderState.status !== 'distrustedWithGracePeriod') {
      return undefined;
    }

    const distrustTimeoutId = window.setTimeout(() => {
      this.isInsideGracePeriod = false;
    }, this.configOptions.gracePeriodTimeoutMs);

    return () => window.clearTimeout(distrustTimeoutId);
  };
}

type GenerateAuthStateInputs = Readonly<{
  authToken: string | undefined;
  initialAuthToken: string;
  authValidityQuery: UseQueryResult<boolean>;
  isInsideGracePeriod: boolean;
}>;

/**
 * This function isn't too big, but it is accounting for a lot of possible
 * configurations that authValidityQuery can be in while background fetches and
 * re-fetches are happening. Can't get away with checking the .status alone
 *
 * @see {@link https://tkdodo.eu/blog/status-checks-in-react-query}
 */
export function generateAuthState({
  authToken,
  initialAuthToken,
  authValidityQuery,
  isInsideGracePeriod,
}: GenerateAuthStateInputs): AuthRenderState {
  const isInitializing =
    initialAuthToken !== '' &&
    authValidityQuery.isLoading &&
    authValidityQuery.isFetching &&
    !authValidityQuery.isFetchedAfterMount;

  if (isInitializing) {
    return {
      status: 'initializing',
      token: undefined,
      error: undefined,
    };
  }

  // Checking the token here is more direct than trying to check the query
  // object's state transitions; React Query has no simple isEnabled property
  if (!authToken) {
    return {
      status: 'tokenMissing',
      token: undefined,
      error: undefined,
    };
  }

  if (BackstageHttpError.isInstance(authValidityQuery.error)) {
    const deploymentLikelyUnavailable =
      authValidityQuery.error.status === 504 ||
      (authValidityQuery.error.status === 200 &&
        authValidityQuery.error.contentType !== 'application/json');

    if (deploymentLikelyUnavailable) {
      return {
        status: 'deploymentUnavailable',
        token: undefined,
        error: authValidityQuery.error,
      };
    }
  }

  const isTokenValidFromPrevFetch = authValidityQuery.data === true;
  if (isTokenValidFromPrevFetch) {
    const canTrustAuthThisRender =
      authValidityQuery.isSuccess && !authValidityQuery.isPaused;
    if (canTrustAuthThisRender) {
      return {
        status: 'authenticated',
        token: authToken,
        error: undefined,
      };
    }

    if (isInsideGracePeriod) {
      return {
        status: 'distrustedWithGracePeriod',
        token: authToken,
        error: undefined,
      };
    }

    return {
      status: 'distrusted',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  // Have to include isLoading here because the auth query uses the
  // isPreviousData property to mask the fact that we're shifting to different
  // query keys and cache pockets each time the token value changes
  const isAuthenticating =
    authValidityQuery.isLoading ||
    (authValidityQuery.isRefetching &&
      ((authValidityQuery.isError && authValidityQuery.data !== true) ||
        (authValidityQuery.isSuccess && authValidityQuery.data === false)));

  if (isAuthenticating) {
    return {
      status: 'authenticating',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  // Catches edge case where only the Backstage client is up, so the token can't
  // be verified (even if it's perfectly valid); all Coder proxy requests are
  // set up to time out after 20 seconds
  const isCoderDeploymentDown =
    authValidityQuery.error instanceof Error &&
    authValidityQuery.error.name === 'TimeoutError';
  if (isCoderDeploymentDown) {
    return {
      status: 'distrusted',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  // Start of catch-all logic; handles remaining possible cases, and aliases
  // "impossible" cases to possible ones (mainly to make compiler happy)
  if (authValidityQuery.isPaused) {
    return {
      status: 'noInternetConnection',
      token: undefined,
      error: authValidityQuery.error,
    };
  }

  return {
    status: 'invalid',
    token: undefined,
    error: authValidityQuery.error,
  };
}

const authQueryKey = [CODER_QUERY_KEY_PREFIX, 'auth'] as const;

function authSnapshot(auth: CoderAuth): UseQueryOptions<AuthStatus> {
  const enabled = Boolean(auth.token);
  return {
    enabled,
    keepPreviousData: enabled,
    queryKey: [...authQueryKey, auth.token],
    queryFn: auth.getAuthStatus,

    // Should probably do something with this?
    placeholderData: () => {
      return null as unknown as AuthRenderState;
    },
  };
}

export const coderAuthRef = createApiRef<CoderAuth>({
  id: 'backstage-plugin-coder.auth',
});

export type AuthRenderState = {
  validation: AuthStatus;
  // Put instance methods from the auth object here
};

export function useCoderAuth(): AuthRenderState {
  const auth = useApi(coderAuthRef);
  const { data: validationInfo } = useQuery(authSnapshot(auth));

  useEffect(() => {
    auth.writeTokenToLocalStorage();
    return auth.processDistrustedToken();
  }, [auth, validationInfo]);

  return {
    validation: validationInfo,
  };
}
