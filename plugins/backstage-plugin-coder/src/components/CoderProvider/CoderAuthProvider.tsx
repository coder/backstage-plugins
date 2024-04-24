/**
 * @file This provider is in a weird spot, because technically, it isn't needed,
 * but it makes testing easier and more often than not makes performance better.
 *
 * All the hook logic for generating the reactAuth value can safely be extracted
 * out into a custom hook that doesn't go through context, and nothing would
 * break. But because the hook has to take the value from the current auth API
 * class, and aggregate it with React Query, a couple of things would change:
 *
 * 1. Every component using the hook would duplicate the work, even though the
 *    values would be exactly the same. Not great for performance.
 * 2. The components would be a lot harder to test, because you would lose
 *    access to React Context for dependency injection.
 *
 * This is a weird hybrid hook for now, but think carefully before trying to
 * move the token auth logic outside the provider.
 */
import React, {
  type PropsWithChildren,
  createContext,
  useEffect,
  useMemo,
  useContext,
} from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import {
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { BackstageHttpError } from '../../api/errors';
import {
  type AuthTokenStateSnapshot,
  CoderTokenAuth,
} from '../../api/CoderTokenAuth';
import { CODER_QUERY_KEY_PREFIX } from '../../api/queryOptions';
import { useApi } from '@backstage/core-plugin-api';
import { useCoderClient } from '../../hooks/useCoderClient';
import { coderAuthApiRef } from '../../api/Auth';

export const tokenAuthQueryKey = [
  CODER_QUERY_KEY_PREFIX,
  'auth-token',
] as const;

type TokenAuthStatusInfo = Readonly<
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

export type CoderTokenAuthUiStatus = TokenAuthStatusInfo['status'];

export type CoderTokenUiAuth = Readonly<
  TokenAuthStatusInfo & {
    isAuthenticated: boolean;
    tokenLoadedOnMount: boolean;
    registerNewToken: (newToken: string) => void;
    ejectToken: () => void;
  }
>;

const validCoderStatuses: readonly CoderTokenAuthUiStatus[] = [
  'authenticated',
  'distrustedWithGracePeriod',
];

export const AuthContext = createContext<CoderTokenUiAuth | null>(null);
type CoderAuthProviderProps = Readonly<PropsWithChildren<unknown>>;

export function useCoderTokenAuth(): CoderTokenUiAuth {
  const contextValue = useContext(AuthContext);
  if (contextValue === null) {
    throw new Error('Cannot call useCoderTokenAuth outside a CoderProvider');
  }

  return contextValue;
}

export const CoderAuthProvider = ({ children }: CoderAuthProviderProps) => {
  const authApi = useApi(coderAuthApiRef);
  if (!CoderTokenAuth.isInstance(authApi)) {
    throw new Error('coderAuthRef is not configured for token auth');
  }

  // Binds React to the auth API in a render-safe way – use snapshot values as
  // much as possible; don't access non-functions directly from the API class
  const safeApiSnapshot = useSyncExternalStore(
    authApi.subscribe,
    authApi.getStateSnapshot,
  );

  const coderClient = useCoderClient();
  const isQueryEnabled = coderClient.state.isAuthValid;

  const authValidityQuery = useQuery<boolean>({
    queryKey: [...tokenAuthQueryKey, safeApiSnapshot.token],
    queryFn: coderClient.internals.validateAuth,
    enabled: isQueryEnabled,
    keepPreviousData: isQueryEnabled,
    refetchOnWindowFocus: query => query.state.data !== false,
  });

  const reactAuth = useMemo<CoderTokenUiAuth>(() => {
    const info = deriveStatusInfo(safeApiSnapshot, authValidityQuery);
    return {
      ...info,
      tokenLoadedOnMount: safeApiSnapshot.initialToken !== '',
      isAuthenticated: validCoderStatuses.includes(info.status),
      registerNewToken: authApi.registerNewToken,
      ejectToken: authApi.clearToken,
    };
  }, [authApi, safeApiSnapshot, authValidityQuery]);

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
        BackstageHttpError.isInstance(queryError) &&
        queryError.status === 401;

      if (!shouldRevalidate) {
        return;
      }

      isRefetchingTokenQuery = true;
      await queryClient.refetchQueries({ queryKey: tokenAuthQueryKey });
      isRefetchingTokenQuery = false;
    });

    return unsubscribe;
  }, [queryClient]);

  return (
    <AuthContext.Provider value={reactAuth}>{children}</AuthContext.Provider>
  );
};

/**
 * This function is big and clunky, but at least it's 100% pure and testable.
 * It has to account for a lot of possible configurations that authValidityQuery
 * can be in while background fetches and re-fetches are happening. Can't get
 * away with checking its .status property alone
 *
 * @see {@link https://tkdodo.eu/blog/status-checks-in-react-query}
 */
export function deriveStatusInfo(
  authStateSnapshot: AuthTokenStateSnapshot,
  authValidityQuery: UseQueryResult<boolean>,
): TokenAuthStatusInfo {
  const { token, initialToken, isInsideGracePeriod } = authStateSnapshot;
  const isInitializing =
    initialToken !== '' &&
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
  if (!token) {
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
        token: token,
        status: 'authenticated',
        error: undefined,
      };
    }

    if (isInsideGracePeriod) {
      return {
        token: token,
        status: 'distrustedWithGracePeriod',
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
