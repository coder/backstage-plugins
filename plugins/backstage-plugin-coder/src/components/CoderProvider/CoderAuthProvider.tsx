/**
 * @file This provider is in a weird spot, because technically, it isn't needed,
 * but it makes testing easier and more often than not makes performance better.
 *
 * All the hook logic for generating the uiAuth value can "safely" be extracted
 * out into a custom hook that doesn't go through context, and nothing would
 * break. But because the hook has to take the value from the current auth API
 * class, and blend it with React Query data, a couple of things would change:
 *
 * 1. Every component using the hook would duplicate the blending work, even
 *    though the results would be exactly the same. Not great for performance.
 * 2. The components would be a lot harder to test, because you would lose
 *    access to React Context for dependency injection.
 *
 * This is a weird hybrid hook for now, where we're only using Context out of
 * convenience. It would be cool if we could get rid of Context, but make sure
 * nothing breaks in the process.
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
  QueryKey,
} from '@tanstack/react-query';
import { BackstageHttpError } from '../../api/errors';
import type { SafeAuthData } from '../../api/Auth';
import { CoderTokenAuth } from '../../api/CoderTokenAuth';
import { CODER_QUERY_KEY_PREFIX } from '../../api/queryOptions';
import { useApi } from '@backstage/core-plugin-api';
import { useCoderClient } from '../../hooks/useCoderClient';
import { coderAuthApiRef } from '../../api/Auth';

export const tokenAuthQueryKey = [
  CODER_QUERY_KEY_PREFIX,
  'auth-token',
] as const;

type AuthStatusInfo = Readonly<
  | {
      // Distrusted represents a token that could be valid, but we are unable to
      // verify it within an allowed window. invalid is definitely, 100% invalid
      status:
        | 'tokenMissing'
        | 'authenticating'
        | 'invalid'
        | 'distrusted'
        | 'noInternetConnection'
        | 'deploymentUnavailable';
      isAuthenticated: false;
      error: unknown;
    }
  | {
      status: 'initializing';
      isAuthenticated: false;
      error: undefined;
    }
  | {
      status: 'authenticated' | 'distrustedWithGracePeriod';
      isAuthenticated: true;
      error: undefined;
    }
>;

export type CoderAuthUiStatus = AuthStatusInfo['status'];

export type CoderUiTokenAuth = Readonly<
  AuthStatusInfo & {
    type: 'token';
    registerNewToken: (newToken: string) => void;
    ejectToken: () => void;
  }
>;

export type CoderUiOAuth = Readonly<
  AuthStatusInfo & {
    type: 'oauth';
  }
>;

export type CoderUiAuth = CoderUiTokenAuth | CoderUiOAuth;

export const AuthContext = createContext<CoderUiAuth | null>(null);

export function useCoderAuth(): CoderUiAuth {
  const contextValue = useContext(AuthContext);
  if (contextValue === null) {
    throw new Error('Cannot call useCoderTokenAuth outside a CoderProvider');
  }

  return contextValue;
}

/**
 * Convenience version of useCoderAuth, where the return value is guaranteed to
 * be of type CoderUiTokenAuth, or else the hook throws an error.
 *
 * This removes the need to keep doing type-narrowing check on the `type`
 * property to access methods specific to the token auth
 */
export function useCoderTokenAuth(): CoderUiTokenAuth {
  const auth = useCoderAuth();
  if (auth.type !== 'token') {
    throw new Error('Coder deployment is not configured for token auth');
  }

  return auth;
}

type CoderAuthProviderProps = Readonly<PropsWithChildren<unknown>>;

export const CoderAuthProvider = ({ children }: CoderAuthProviderProps) => {
  const authApi = useApi(coderAuthApiRef);

  // Binds React to the auth API in a render-safe way – use snapshot values as
  // much as possible; don't access non-functions directly from the API class
  const safeApiSnapshot = useSyncExternalStore(
    authApi.subscribe,
    authApi.getStateSnapshot,
  );

  let queryKey: QueryKey;
  if (CoderTokenAuth.isInstance(authApi)) {
    queryKey = [...tokenAuthQueryKey, safeApiSnapshot.tokenHash];
  } else {
    throw new Error(
      'coderAuthRef is not yet configured for Coder Oauth. Please switch to token auth.',
    );
  }

  const coderClient = useCoderClient();
  const isQueryEnabled = safeApiSnapshot.tokenHash !== null;

  const authValidityQuery = useQuery<boolean>({
    queryKey,
    queryFn: coderClient.internals.validateAuth,
    enabled: isQueryEnabled,
    keepPreviousData: isQueryEnabled,
    refetchOnWindowFocus: query => query.state.data !== false,
  });

  const uiAuth = useMemo<CoderUiAuth>(() => {
    const info = deriveStatusInfo(safeApiSnapshot, authValidityQuery);
    if (CoderTokenAuth.isInstance(authApi)) {
      return {
        ...info,
        type: 'token',
        registerNewToken: authApi.registerNewToken,
        ejectToken: authApi.clearToken,
      };
    }

    return { ...info, type: 'oauth' };
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

  return <AuthContext.Provider value={uiAuth}>{children}</AuthContext.Provider>;
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
  authStateSnapshot: SafeAuthData,
  authValidityQuery: UseQueryResult<boolean>,
): AuthStatusInfo {
  const { tokenHash, initialTokenHash, isInsideGracePeriod } =
    authStateSnapshot;

  const isInitializing =
    initialTokenHash !== null &&
    authValidityQuery.isLoading &&
    authValidityQuery.isFetching &&
    !authValidityQuery.isFetchedAfterMount;

  if (isInitializing) {
    return {
      status: 'initializing',
      isAuthenticated: false,
      error: undefined,
    };
  }

  // Checking the token here is more direct than trying to check the query
  // object's state transitions; React Query has no simple isEnabled property
  if (tokenHash === null) {
    return {
      status: 'tokenMissing',
      isAuthenticated: false,
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
        isAuthenticated: false,
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
        isAuthenticated: true,
        error: undefined,
      };
    }

    if (isInsideGracePeriod) {
      return {
        status: 'distrustedWithGracePeriod',
        isAuthenticated: true,
        error: undefined,
      };
    }

    return {
      status: 'distrusted',
      isAuthenticated: false,
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
      isAuthenticated: false,
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
      isAuthenticated: false,
      error: authValidityQuery.error,
    };
  }

  // Start of catch-all logic; handles remaining possible cases, and aliases
  // "impossible" cases to possible ones (mainly to make compiler happy)
  if (authValidityQuery.isPaused) {
    return {
      status: 'noInternetConnection',
      isAuthenticated: false,
      error: authValidityQuery.error,
    };
  }

  return {
    status: 'invalid',
    isAuthenticated: false,
    error: authValidityQuery.error,
  };
}
