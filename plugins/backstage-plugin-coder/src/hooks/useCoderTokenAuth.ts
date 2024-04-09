import { useSyncExternalStore } from 'react';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useApi } from '@backstage/core-plugin-api';
import { CODER_QUERY_KEY_PREFIX } from '../api/queryOptions';
import { BackstageHttpError } from '../api/errors';
import {
  CoderTokenAuth,
  type AuthTokenStateSnapshot,
} from '../api/CoderTokenAuth';
import { coderAuthApiRef } from '../api/Auth';

export const tokenAuthQueryKey = [
  CODER_QUERY_KEY_PREFIX,
  'auth-token',
] as const;

type TokenAuthStatusSummary = Readonly<
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

export type CoderTokenAuthUiStatus = TokenAuthStatusSummary['status'];

export type CoderTokenUiAuth = Readonly<
  TokenAuthStatusSummary & {
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

export function useCoderTokenAuth(): CoderTokenUiAuth {
  const authApi = useApi(coderAuthApiRef);
  if (!CoderTokenAuth.isInstance(authApi)) {
    throw new Error('coderAuthRef is not configured for token auth');
  }

  // Even though a lot of the values on apiSnapshot mirror the ones you can just
  // grab from authApi, accessing non-functions from authApi is not safe within
  // the React UI. The API uses mutable values, and React will not be able to
  // re-render in response to them changing. The snapshot binds React to the API
  // in a render-safe way – use the snapshot values as much as possible
  const apiSnapshot = useSyncExternalStore(
    authApi.subscribe,
    authApi.getStateSnapshot,
  );

  const isQueryEnabled = Boolean(apiSnapshot.currentToken);
  const authValidityQuery = useQuery({
    queryKey: [...tokenAuthQueryKey, apiSnapshot.currentToken],
    queryFn: () => authApi.validateToken(apiSnapshot.currentToken),
    enabled: isQueryEnabled,
    keepPreviousData: isQueryEnabled,
    refetchOnWindowFocus: query => query.state.data !== false,
  });

  const summary = deriveStatusSummary(apiSnapshot, authValidityQuery);
  return {
    ...summary,
    tokenLoadedOnMount: apiSnapshot.initialToken !== '',
    isAuthenticated: validCoderStatuses.includes(summary.status),
    registerNewToken: authApi.registerNewToken,
    ejectToken: authApi.clearToken,
  };
}

/**
 * This function is big and clunky, but at least it's 100% pure and testable.
 * It has to account for a lot of possible configurations that authValidityQuery
 * can be in while background fetches and re-fetches are happening. Can't get
 * away with checking its .status property alone
 *
 * @see {@link https://tkdodo.eu/blog/status-checks-in-react-query}
 */
export function deriveStatusSummary(
  authStateSnapshot: AuthTokenStateSnapshot,
  authValidityQuery: UseQueryResult<boolean>,
): TokenAuthStatusSummary {
  const { currentToken, initialToken, isInsideGracePeriod } = authStateSnapshot;
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
  if (!currentToken) {
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
        token: currentToken,
        status: 'authenticated',
        error: undefined,
      };
    }

    if (isInsideGracePeriod) {
      return {
        token: currentToken,
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
