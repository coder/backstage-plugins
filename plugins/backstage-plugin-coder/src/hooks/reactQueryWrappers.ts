/**
 * @file Defines a couple of wrappers over React Query/Tanstack Query that make
 * it easier to use the Coder SDK within UI logic.
 *
 * These hooks are designed 100% for end-users, and should not be used
 * internally. Use useEndUserCoderAuth when working with auth logic within these
 * hooks.
 */
import {
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { DEFAULT_TANSTACK_QUERY_RETRY_COUNT } from '../typesConstants';
import { useEndUserCoderAuth } from '../components/CoderProvider';

export function useCoderQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryOptions: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const { isAuthenticated } = useEndUserCoderAuth();

  const patchedOptions: typeof queryOptions = {
    ...queryOptions,
    enabled: isAuthenticated && (queryOptions.enabled ?? true),
    keepPreviousData:
      isAuthenticated && (queryOptions.keepPreviousData ?? false),
    refetchIntervalInBackground:
      isAuthenticated && (queryOptions.refetchIntervalInBackground ?? false),

    refetchInterval: (data, query) => {
      if (!isAuthenticated) {
        return false;
      }

      const externalRefetchInterval = queryOptions.refetchInterval;
      if (typeof externalRefetchInterval !== 'function') {
        return externalRefetchInterval ?? false;
      }

      return externalRefetchInterval(data, query);
    },

    refetchOnMount: query => {
      if (!isAuthenticated) {
        return false;
      }

      const externalRefetchOnMount = queryOptions.refetchOnMount;
      if (typeof externalRefetchOnMount !== 'function') {
        return externalRefetchOnMount ?? true;
      }

      return externalRefetchOnMount(query);
    },

    retry: (failureCount, error) => {
      if (!isAuthenticated) {
        return false;
      }

      const externalRetry = queryOptions.retry;
      if (typeof externalRetry === 'number') {
        return (
          failureCount < (externalRetry ?? DEFAULT_TANSTACK_QUERY_RETRY_COUNT)
        );
      }

      if (typeof externalRetry !== 'function') {
        return externalRetry ?? true;
      }

      return externalRetry(failureCount, error);
    },
  };

  return useQuery(patchedOptions);
}

export function useCoderMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationOptions: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { isAuthenticated } = useEndUserCoderAuth();
  const queryClient = useQueryClient();

  const patchedOptions: typeof mutationOptions = {
    ...mutationOptions,
    mutationFn: variables => {
      // useMutation doesn't expose an enabled property, so the best we can do
      // is immediately throw an error if the user isn't authenticated
      if (!isAuthenticated) {
        throw new Error(
          'Cannot perform Coder mutations without being authenticated',
        );
      }

      const defaultMutationOptions = queryClient.getMutationDefaults();
      const externalMutationFn =
        mutationOptions.mutationFn ?? defaultMutationOptions?.mutationFn;

      if (externalMutationFn === undefined) {
        throw new Error('No mutation function has been provided');
      }

      return externalMutationFn(variables);
    },

    retry: (failureCount, error) => {
      if (!isAuthenticated) {
        return false;
      }

      const externalRetry = mutationOptions.retry;
      if (typeof externalRetry === 'number') {
        return (
          failureCount < (externalRetry ?? DEFAULT_TANSTACK_QUERY_RETRY_COUNT)
        );
      }

      if (typeof externalRetry !== 'function') {
        return externalRetry ?? true;
      }

      return externalRetry(failureCount, error);
    },

    retryDelay: (failureCount, error) => {
      /**
       * Formula is one of the examples of exponential backoff taken straight
       * from the React Query docs
       * @see {@link https://tanstack.com/query/v4/docs/framework/react/reference/useMutation}
       */
      const exponentialDelay = Math.min(
        failureCount > 1 ? 2 ** failureCount * 1000 : 1000,
        30 * 1000,
      );

      if (!isAuthenticated) {
        // Doesn't matter what value we return out as long as the retry property
        // consistently returns false when not authenticated. Considered using
        // Infinity, but didn't have time to look up whether that would break
        // anything in the React Query internals
        return exponentialDelay;
      }

      const externalRetryDelay = mutationOptions.retryDelay;
      if (typeof externalRetryDelay !== 'function') {
        return externalRetryDelay ?? exponentialDelay;
      }

      return externalRetryDelay(failureCount, error);
    },
  };

  return useMutation(patchedOptions);
}
