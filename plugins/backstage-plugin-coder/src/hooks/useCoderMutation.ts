import {
  type UseMutationOptions,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import { useEndUserCoderAuth } from '../components/CoderProvider';
import { DEFAULT_TANSTACK_QUERY_RETRY_COUNT } from '../typesConstants';

export function useCoderMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(mutationOptions: UseMutationOptions<TData, TError, TVariables, TContext>) {
  // This hook is intended for the end user only; don't need internal version of
  // auth hook
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

      // Doesn't matter what value we return out as long as the retry property
      // consistently returns false when not authenticated. Considered using
      // Infinity, but didn't have time to look up whether that would break
      // anything in the React Query internals
      if (!isAuthenticated) {
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
