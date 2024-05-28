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
 */
import {
  type QueryFunctionContext,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { DEFAULT_TANSTACK_QUERY_RETRY_COUNT } from '../typesConstants';
import { useEndUserCoderAuth } from '../components/CoderProvider';
import { CODER_QUERY_KEY_PREFIX } from '../api/queryOptions';
import { useCoderSdk } from './useCoderSdk';
import type { BackstageCoderSdk } from '../api/CoderClient';

export type CoderQueryFunctionContext<TQueryKey extends QueryKey = QueryKey> =
  QueryFunctionContext<TQueryKey> & {
    sdk: BackstageCoderSdk;
  };

export type CoderQueryFunction<
  T = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = (context: CoderQueryFunctionContext<TQueryKey>) => Promise<T>;

export type UseCoderQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn'> & {
  queryFn: CoderQueryFunction<TQueryFnData, TQueryKey>;
};

export function useCoderQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryOptions: UseCoderQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useEndUserCoderAuth();
  const { sdk } = useCoderSdk();

  let patchedQueryKey = queryOptions.queryKey;
  if (
    patchedQueryKey === undefined ||
    patchedQueryKey[0] !== CODER_QUERY_KEY_PREFIX
  ) {
    const baseKey =
      queryOptions.queryKey ?? queryClient.defaultQueryOptions().queryKey;

    if (baseKey === undefined) {
      throw new Error('No queryKey value provided to useCoderQuery');
    }

    patchedQueryKey = [
      CODER_QUERY_KEY_PREFIX,
      ...baseKey,
    ] as QueryKey as TQueryKey;
  }

  type Options = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;
  const patchedOptions: Options = {
    ...queryOptions,
    queryKey: patchedQueryKey,
    enabled: isAuthenticated && (queryOptions.enabled ?? true),
    keepPreviousData:
      isAuthenticated && (queryOptions.keepPreviousData ?? false),
    refetchIntervalInBackground:
      isAuthenticated && (queryOptions.refetchIntervalInBackground ?? false),

    queryFn: async context => {
      if (!isAuthenticated) {
        throw new Error('Cannot complete request - user is not authenticated');
      }

      return queryOptions.queryFn({ ...context, sdk });
    },

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
        const normalized = Number.isInteger(externalRetry)
          ? Math.max(1, externalRetry)
          : DEFAULT_TANSTACK_QUERY_RETRY_COUNT;

        return failureCount < normalized;
      }

      if (typeof externalRetry !== 'function') {
        // Could use the nullish coalescing operator here, but Prettier made the
        // output hard to read
        return externalRetry
          ? externalRetry
          : failureCount < DEFAULT_TANSTACK_QUERY_RETRY_COUNT;
      }

      return externalRetry(failureCount, error);
    },
  };

  return useQuery(patchedOptions);
}
