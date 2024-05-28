import React, { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { useCoderQuery } from './reactQueryWrappers';
import { useEndUserCoderAuth } from '../components/CoderProvider';
import { CoderProvider } from '../plugin';
import {
  mockAppConfig,
  mockCoderAuthToken,
} from '../testHelpers/mockBackstageData';
import { getMockQueryClient } from '../testHelpers/setup';
import userEvent from '@testing-library/user-event';

type RenderMockQueryComponentOptions = Readonly<{
  children: ReactNode;
  queryClient?: QueryClient;
}>;

function renderMockQueryComponent(options: RenderMockQueryComponentOptions) {
  const { children: mainComponent, queryClient = getMockQueryClient() } =
    options;

  const injectorLabel = 'Register mock Coder token';
  const TokenInjector = () => {
    const { isAuthenticated, registerNewToken } = useEndUserCoderAuth();

    if (isAuthenticated) {
      return null;
    }

    return (
      <button onClick={() => registerNewToken(mockCoderAuthToken)}>
        {injectorLabel}
      </button>
    );
  };

  const injectMockToken = async (): Promise<void> => {
    const injectorButton = await screen.findByRole('button', {
      name: injectorLabel,
    });

    const user = userEvent.setup();
    await user.click(injectorButton);

    return waitFor(() => expect(injectorButton).not.toBeInTheDocument());
  };

  const renderOutput = render(mainComponent, {
    wrapper: ({ children }) => (
      <CoderProvider
        showFallbackAuthForm
        appConfig={mockAppConfig}
        queryClient={queryClient}
      >
        {children}
        <TokenInjector />
      </CoderProvider>
    ),
  });

  return {
    ...renderOutput,
    injectMockToken,
  };
}

describe(`${useCoderQuery.name}`, () => {
  it('Does not enable requests until the user is authenticated', async () => {
    const MockUserComponent = () => {
      const query = useCoderQuery({
        queryKey: ['workspaces'],
        queryFn: ({ sdk }) => sdk.getWorkspaces({ q: 'owner:me' }),
        select: response => response.workspaces,
      });

      return (
        <div>
          {query.error instanceof Error && (
            <p>Encountered error: {query.error.message}</p>
          )}

          {query.isLoading && <p>Loading&hellip;</p>}

          {query.data !== undefined && (
            <ul>
              {query.data.map(workspace => (
                <li key={workspace.id}>{workspace.name}</li>
              ))}
            </ul>
          )}
        </div>
      );
    };

    const { injectMockToken } = renderMockQueryComponent({
      children: <MockUserComponent />,
    });

    expect.hasAssertions();
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
