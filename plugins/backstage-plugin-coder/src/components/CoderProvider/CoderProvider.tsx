import React, { type ComponentProps } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CoderAuthProvider } from './CoderAuthProvider';
import { CoderAppConfigProvider } from './CoderAppConfigProvider';
import { CoderErrorBoundary } from '../CoderErrorBoundary';
import { BackstageHttpError } from '../../api/errors';

const MAX_FETCH_FAILURES = 3;

export type CoderProviderProps = ComponentProps<
  typeof CoderAppConfigProvider
> & {
  queryClient?: QueryClient;
};

const shouldRetryRequest = (failureCount: number, error: unknown): boolean => {
  const isBelowThreshold = failureCount < MAX_FETCH_FAILURES;
  if (!BackstageHttpError.isInstance(error)) {
    return isBelowThreshold;
  }

  const isAuthenticationError = error.status === 401;
  const isLikelyProxyConfigurationError =
    error.status === 504 ||
    (error.status === 200 && error.contentType !== 'application/json');

  return (
    !isAuthenticationError &&
    !isLikelyProxyConfigurationError &&
    isBelowThreshold
  );
};

const defaultClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryRequest,
    },
    mutations: {
      retry: shouldRetryRequest,
    },
  },
});

export const CoderProvider = ({
  children,
  appConfig,
  queryClient = defaultClient,
}: CoderProviderProps) => {
  return (
    <CoderErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CoderAppConfigProvider appConfig={appConfig}>
          <CoderAuthProvider>{children}</CoderAuthProvider>
        </CoderAppConfigProvider>
      </QueryClientProvider>
    </CoderErrorBoundary>
  );
};
