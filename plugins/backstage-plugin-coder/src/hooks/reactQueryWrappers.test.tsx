import React, { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { type QueryClient } from '@tanstack/react-query';
import { useCoderQuery } from './reactQueryWrappers';
import {
  CoderProvider,
  CoderAuth,
  useEndUserCoderAuth,
} from '../components/CoderProvider';
import {
  getMockApiList,
  mockAppConfig,
  mockCoderAuthToken,
} from '../testHelpers/mockBackstageData';
import { getMockQueryClient } from '../testHelpers/setup';
import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';

type RenderMockQueryOptions = Readonly<{
  children: ReactNode;
  queryClient?: QueryClient;
}>;

function renderMockQueryComponent(options: RenderMockQueryOptions) {
  const { children: mainComponent, queryClient = getMockQueryClient() } =
    options;

  let latestRegisterNewToken!: CoderAuth['registerNewToken'];
  let latestEjectToken!: CoderAuth['ejectToken'];

  const AuthEscapeHatch = () => {
    const auth = useEndUserCoderAuth();
    latestRegisterNewToken = auth.registerNewToken;
    latestEjectToken = auth.ejectToken;

    return null;
  };

  const renderOutput = render(mainComponent, {
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
  });

  return {
    ...renderOutput,
    registerNewToken: (newToken: string) => {
      return act(() => latestRegisterNewToken(newToken));
    },
    ejectToken: () => {
      return act(() => latestEjectToken());
    },
  };
}

describe(`${useCoderQuery.name}`, () => {
  it('Disables requests while user is not authenticated', async () => {
    const MockUserComponent = () => {
      const workspacesQuery = useCoderQuery({
        queryKey: ['workspaces'],
        queryFn: ({ sdk }) => sdk.getWorkspaces({ q: 'owner:me' }),
        select: response => response.workspaces,
      });

      return (
        <div>
          {workspacesQuery.error instanceof Error && (
            <p>Encountered error: {workspacesQuery.error.message}</p>
          )}

          {workspacesQuery.isLoading && <p>Loading&hellip;</p>}

          {workspacesQuery.data !== undefined && (
            <ul>
              {workspacesQuery.data.map(workspace => (
                <li key={workspace.id}>{workspace.name}</li>
              ))}
            </ul>
          )}
        </div>
      );
    };

    const loadingMatcher = /^Loading/;
    const { registerNewToken, ejectToken } = renderMockQueryComponent({
      children: <MockUserComponent />,
    });

    const initialLoadingIndicator = screen.getByText(loadingMatcher);
    registerNewToken(mockCoderAuthToken);

    await waitFor(() => {
      const workspaceItems = screen.getAllByRole('listitem');
      expect(workspaceItems.length).toBeGreaterThan(0);
      expect(initialLoadingIndicator).not.toBeInTheDocument();
    });

    ejectToken();
    const newLoadingIndicator = await screen.findByText(loadingMatcher);
    expect(newLoadingIndicator).toBeInTheDocument();
  });

  it('Never retries requests if the user is not authenticated', () => {
    expect.hasAssertions();
  });

  it('Never displays previous data for changing query keys if the user is not authenticated', () => {
    expect.hasAssertions();
  });

  it("Automatically prefixes queryKey with the global Coder query key prefix if it doesn't already exist", () => {
    expect.hasAssertions();
  });

  it('Disables all refetch-based properties when the user is not authenticated', () => {
    expect.hasAssertions();
  });

  it('Behaves exactly like useQuery if the user is fully authenticated (aside from queryKey patching)', () => {
    expect.hasAssertions();
  });

  it('Disables everything when the user unlinks their access token', () => {
    expect.hasAssertions();
  });
});
