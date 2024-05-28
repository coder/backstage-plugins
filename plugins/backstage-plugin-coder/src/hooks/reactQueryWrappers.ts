/**
 * @file Defines a couple of wrappers over React Query/Tanstack Query that make
 * it easier to use the Coder SDK within UI logic.
 *
 * These hooks are designed 100% for end-users, and should not be used
 * internally. Use useEndUserCoderAuth when working with auth logic within these
 * hooks.
 *
 * ---
 * @todo 2024-05-28 - This isn't fully complete until we have an equivalent
 * wrapper for useMutation, and have an idea of how useCoderQuery and
 * useCoderMutation can be used together.
 *
 * Making the useMutation wrapper shouldn't be hard, but you want some good
 * integration tests to verify that the two hooks can satisfy common user flows.
 *
 * Draft version of wrapper:
 * @see {@link https://gist.github.com/Parkreiner/5c1e01f820500a49e2e81897a507e907}
 */
import {
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { DEFAULT_TANSTACK_QUERY_RETRY_COUNT } from '../typesConstants';
import { useEndUserCoderAuth } from '../components/CoderProvider';
import { CODER_QUERY_KEY_PREFIX } from '../api/queryOptions';

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
    queryKey: [
      CODER_QUERY_KEY_PREFIX,
      ...(queryOptions.queryKey ?? []),
    ] as QueryKey as TQueryKey,

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
