import React, { type ComponentProps } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CoderAuthProvider } from './CoderAuthProvider';
import { CoderAppConfigProvider } from './CoderAppConfigProvider';
import { CoderErrorBoundary } from '../CoderErrorBoundary';
import { BackstageHttpError } from '../../api';

export type CoderProviderProps = ComponentProps<typeof CoderAuthProvider> &
  ComponentProps<typeof CoderAppConfigProvider> & {
    queryClient?: QueryClient;
  };

const shouldRetryRequest = (failureCount: number, error: unknown): boolean => {
  const tooManyFailures = failureCount >= 3;

  // Have to duplicate a logic a little bit to improve type narrowing
  if (!(error instanceof BackstageHttpError)) {
    return tooManyFailures;
  }

  // This should trigger when there is an issue with the Backstage auth setup;
  // just immediately give up on retries
  if (error.status === 401) {
    return false;
  }

  // This is rare, but a likely a sign that the proxy isn't set up properly
  if (error.status === 200 && error.contentType !== 'application/json') {
    return false;
  }

  return tooManyFailures;
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
