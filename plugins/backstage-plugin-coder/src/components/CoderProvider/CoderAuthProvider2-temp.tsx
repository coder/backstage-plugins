import React, { type PropsWithChildren, createContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BackstageHttpError } from '../../api/errors';
import { type AuthRenderState, useCoderAuth } from '../../api/CoderAuth';
import { authQueryKey } from '../../api/queryOptions';

export const AuthContext = createContext<AuthRenderState | null>(null);
type CoderAuthProviderProps = Readonly<PropsWithChildren<unknown>>;

export const CoderAuthProvider = ({ children }: CoderAuthProviderProps) => {
  const coderAuth = useCoderAuth();

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
      await queryClient.refetchQueries({ queryKey: authQueryKey });
      isRefetchingTokenQuery = false;
    });

    return unsubscribe;
  }, [queryClient]);

  return (
    <AuthContext.Provider value={coderAuth}>{children}</AuthContext.Provider>
  );
};
