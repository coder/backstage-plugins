/**
 * @file Provides a convenience wrapper for end users trying to cache data from
 * the Coder SDK. Removes the need to manually bring in useCoderAuth and wire
 * it up to all of useQuery's config properties
 *
 * This has a little more overhead, but the hook is a lot more fire-and-forget
 */
import {
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { useEndUserCoderAuth } from '../components/CoderProvider';
import { DEFAULT_TANSTACK_QUERY_RETRY_COUNT } from '../typesConstants';

export function useCoderQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryOptions: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  // This hook is intended for the end user only; don't need internal version of
  // auth hook
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
