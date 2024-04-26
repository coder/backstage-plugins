import React, {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  BackstageHttpError,
  CODER_QUERY_KEY_PREFIX,
  authQueryKey,
  authValidation,
} from '../../api';
import { useUrlSync } from '../../hooks/useUrlSync';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';

const TOKEN_STORAGE_KEY = 'coder-backstage-plugin/token';

// Handles auth edge case where a previously-valid token can't be verified. Not
// immediately removing token to provide better UX in case someone's internet
// disconnects for a few seconds
const AUTH_GRACE_PERIOD_TIMEOUT_MS = 6_000;

type AuthState = Readonly<
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
      // Distrusted represents a token that could be valid, but we are unable to
      // verify it within an allowed window. invalid is definitely, 100% invalid
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

export type CoderAuthStatus = AuthState['status'];
export type CoderAuth = Readonly<
  AuthState & {
    isAuthenticated: boolean;
    tokenLoadedOnMount: boolean;
    registerNewToken: (newToken: string) => void;
    ejectToken: () => void;
  }
>;

function isAuthValid(state: AuthState): boolean {
  return (
    state.status === 'authenticated' ||
    state.status === 'distrustedWithGracePeriod'
  );
}

type ValidCoderAuth = Extract<
  CoderAuth,
  { status: 'authenticated' | 'distrustedWithGracePeriod' }
>;

export function assertValidCoderAuth(
  auth: CoderAuth,
): asserts auth is ValidCoderAuth {
  if (!isAuthValid(auth)) {
    throw new Error('Coder auth is not valid');
  }
}

export const AuthContext = createContext<CoderAuth | null>(null);

export function useCoderAuth(): CoderAuth {
  const contextValue = useContext(AuthContext);
  if (contextValue === null) {
    throw new Error(
      `Hook ${useCoderAuth.name} is being called outside of CoderProvider`,
    );
  }

  return contextValue;
}

type CoderAuthProviderProps = Readonly<PropsWithChildren<unknown>>;

export const CoderAuthProvider = ({ children }: CoderAuthProviderProps) => {
  const identity = useApi(identityApiRef);
  const { baseUrl } = useUrlSync();
  const [isInsideGracePeriod, setIsInsideGracePeriod] = useState(true);

  // Need to split hairs, because the query object can be disabled. Only want to
  // expose the initializing state if the app mounts with a token already in
  // localStorage
  const [authToken, setAuthToken] = useState(readAuthToken);
  const [readonlyInitialAuthToken] = useState(authToken);

  const authValidityQuery = useQuery({
    ...authValidation({ baseUrl, authToken, identity }),
    refetchOnWindowFocus: query => query.state.data !== false,
  });

  const authState = generateAuthState({
    authToken,
    authValidityQuery,
    isInsideGracePeriod,
    initialAuthToken: readonlyInitialAuthToken,
  });

  // Mid-render state sync to avoid unnecessary re-renders that useEffect would
  // introduce, especially since we don't know how costly re-renders could be in
  // someone's arbitrarily-large Backstage deployment
  if (!isInsideGracePeriod && authState.status === 'authenticated') {
    setIsInsideGracePeriod(true);
  }

  useEffect(() => {
    if (authState.status === 'authenticated') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, authState.token);
    }
  }, [authState.status, authState.token]);

  // Starts ticking down seconds before we start fully distrusting a token
  useEffect(() => {
    if (authState.status !== 'distrustedWithGracePeriod') {
      return undefined;
    }

    const distrustTimeoutId = window.setTimeout(() => {
      setIsInsideGracePeriod(false);
    }, AUTH_GRACE_PERIOD_TIMEOUT_MS);

    return () => window.clearTimeout(distrustTimeoutId);
  }, [authState.status]);

  // Sets up subscription to spy on potentially-expired tokens. Can't do this
  // outside React because we let the user connect their own queryClient
  const queryClient = useQueryClient();
  useEffect(() => {
    let isRefetchingTokenQuery = false;
    const queryCache = queryClient.getQueryCache();

    const unsubscribe = queryCache.subscribe(async event => {
      const queryError = event.query.state.error;
      const shouldRevalidate =
        !isRefetchingTokenQuery &&
        queryError instanceof BackstageHttpError &&
        queryError.status === 401;

      if (!shouldRevalidate) {
        return;
      }

      isRefetchingTokenQuery = true;
      await queryClient.refetchQueries({ queryKey: authQueryKey });
      isRefetchingTokenQuery = false;
    });

    return unsubscribe;
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        isAuthenticated: isAuthValid(authState),
        tokenLoadedOnMount: readonlyInitialAuthToken !== '',
        registerNewToken: newToken => {
          if (newToken !== '') {
            setAuthToken(newToken);
          }
        },
        ejectToken: () => {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          queryClient.removeQueries({ queryKey: [CODER_QUERY_KEY_PREFIX] });
          setAuthToken('');
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

type GenerateAuthStateInputs = Readonly<{
  authToken: string;
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
function generateAuthState({
  authToken,
  initialAuthToken,
  authValidityQuery,
  isInsideGracePeriod,
}: GenerateAuthStateInputs): AuthState {
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

  if (authValidityQuery.error instanceof BackstageHttpError) {
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

function readAuthToken(): string {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
}
