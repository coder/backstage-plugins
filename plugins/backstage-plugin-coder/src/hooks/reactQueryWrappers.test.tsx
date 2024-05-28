import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type {
  QueryClient,
  QueryKey,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  type UseCoderQueryOptions,
  useCoderQuery,
  CoderQueryFunction,
} from './reactQueryWrappers';
import {
  type CoderAuth,
  CoderProvider,
  useEndUserCoderAuth,
} from '../components/CoderProvider';
import {
  getMockApiList,
  mockAppConfig,
  mockCoderAuthToken,
} from '../testHelpers/mockBackstageData';
import {
  createInvertedPromise,
  getMockQueryClient,
} from '../testHelpers/setup';
import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';
import { CODER_QUERY_KEY_PREFIX } from '../plugin';
import { mockWorkspacesList } from '../testHelpers/mockCoderPluginData';

type RenderUseQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Readonly<{
  authenticateOnMount?: boolean;
  queryClient?: QueryClient;
  queryOptions: UseCoderQueryOptions<TQueryFnData, TError, TData, TQueryKey>;
}>;

async function renderCoderQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: RenderUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const {
    queryOptions,
    authenticateOnMount = true,
    queryClient = getMockQueryClient(),
  } = options;

  let latestRegisterNewToken!: CoderAuth['registerNewToken'];
  let latestEjectToken!: CoderAuth['ejectToken'];
  const AuthEscapeHatch = () => {
    const auth = useEndUserCoderAuth();
    latestRegisterNewToken = auth.registerNewToken;
    latestEjectToken = auth.ejectToken;

    return null;
  };

  type Result = UseQueryResult<TData, TError>;
  const renderOutput = renderHook<Result, typeof queryOptions>(
    newOptions => useCoderQuery(newOptions),
    {
      initialProps: queryOptions,
      wrapper: ({ children }) => {
        const mainMarkup = (
          <TestApiProvider apis={getMockApiList()}>
            <CoderProvider
              showFallbackAuthForm
              appConfig={mockAppConfig}
              queryClient={queryClient}
            >
              {children}
              <AuthEscapeHatch />
            </CoderProvider>
          </TestApiProvider>
        );

        return wrapInTestApp(mainMarkup) as unknown as typeof mainMarkup;
      },
    },
  );

  await waitFor(() => expect(renderOutput.result.current).not.toBeNull());

  const registerMockToken = () => {
    return act(() => latestRegisterNewToken(mockCoderAuthToken));
  };

  const ejectToken = () => {
    return act(() => latestEjectToken());
  };

  if (authenticateOnMount) {
    registerMockToken();
  }

  return { ...renderOutput, registerMockToken, ejectToken };
}

describe(`${useCoderQuery.name}`, () => {
  /**
   * Really wanted to make mock components for each test case, to simulate some
   * of the steps of using the hook as an actual end-user, but the setup steps
   * got to be a bit much, just because of all the dependencies to juggle.
   *
   * @todo Add a new describe block with custom components to mirror some
   * example user flows
   */
  describe('Hook functionality', () => {
    it('Disables requests while user is not authenticated', async () => {
      const { result, registerMockToken, ejectToken } = await renderCoderQuery({
        authenticateOnMount: false,
        queryOptions: {
          queryKey: ['workspaces'],
          queryFn: ({ sdk }) => sdk.getWorkspaces({ q: 'owner:me' }),
          select: response => response.workspaces,
        },
      });

      expect(result.current.isLoading).toBe(true);
      registerMockToken();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.length).toBeGreaterThan(0);
      });

      ejectToken();
      await waitFor(() => expect(result.current.isLoading).toBe(true));
    });

    it("Automatically prefixes queryKey with the global Coder query key prefix if it isn't already there", async () => {
      // Have to escape out the key because useQuery doesn't expose any way to
      // access the key after it's been processed into a query result object
      let processedQueryKey: QueryKey | undefined = undefined;

      const queryFnWithEscape: CoderQueryFunction = ({ queryKey }) => {
        processedQueryKey = queryKey;
        return Promise.resolve(mockWorkspacesList);
      };

      // Verify that key is updated if the prefix isn't already there
      const { unmount } = await renderCoderQuery({
        queryOptions: {
          queryKey: ['blah'],
          queryFn: queryFnWithEscape,
        },
      });

      await waitFor(() => {
        expect(processedQueryKey).toEqual<QueryKey>([
          CODER_QUERY_KEY_PREFIX,
          'blah',
        ]);
      });

      // Unmounting shouldn't really be necessary, but it helps guarantee that
      // there's never any risks of states messing with each other
      unmount();

      // Verify that the key is unchanged if the prefix is already present
      await renderCoderQuery({
        queryOptions: {
          queryKey: [CODER_QUERY_KEY_PREFIX, 'nah'],
          queryFn: queryFnWithEscape,
        },
      });

      await waitFor(() => {
        expect(processedQueryKey).toEqual<QueryKey>([
          CODER_QUERY_KEY_PREFIX,
          'nah',
        ]);
      });
    });

    it('Disables everything when the user unlinks their access token', async () => {
      const { result, ejectToken } = await renderCoderQuery({
        queryOptions: {
          queryKey: ['workspaces'],
          queryFn: () => Promise.resolve(mockWorkspacesList),
        },
      });

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining<Partial<UseQueryResult>>({
            isSuccess: true,
            isPaused: false,
            data: mockWorkspacesList,
          }),
        );
      });

      ejectToken();

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining<Partial<UseQueryResult>>({
            isLoading: true,
            isPaused: false,
            data: undefined,
          }),
        );
      });
    });

    /**
     * In case the title isn't clear (had to rewrite it a bunch), the flow is:
     *
     * 1. User gets authenticated
     * 2. User makes a request that will fail
     * 3. Before the request comes back, the user revokes their authentication
     * 4. The failed request comes back, which would normally add error state,
     *    and kick off a bunch of retry logic for React Query
     * 5. But the hook should tell the Query Client NOT retry the request
     *    because the user is no longer authenticated
     */
    it('Will not retry a request if it gets sent out while the user is authenticated, but then fails after the user revokes authentication', async () => {
      const { promise, reject } = createInvertedPromise();
      const queryFn = jest.fn(() => promise);

      const { ejectToken } = await renderCoderQuery({
        queryOptions: {
          queryFn,
          queryKey: ['blah'],

          // From the end user's perspective, the query should always retry, but
          // the hook should override that when the user isn't authenticated
          retry: true,
        },
      });

      await waitFor(() => expect(queryFn).toHaveBeenCalled());
      ejectToken();

      queryFn.mockRestore();
      act(() => reject(new Error("Don't feel like giving you data today")));
      expect(queryFn).not.toHaveBeenCalled();
    });
  });
});
