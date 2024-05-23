/**
 * @file Ideally all the files in CoderProvider could be treated as
 * implementation details, and we could have a single test file for all the
 * pieces joined together.
 *
 * But because the auth is complicated, it helps to have tests just for it
 */
import React, { type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  BACKSTAGE_APP_ROOT_ID,
  CoderAuthProvider,
  TOKEN_STORAGE_KEY,
  useEndUserCoderAuth,
  useInternalCoderAuth,
} from './CoderAuthProvider';
import { CoderClient, coderClientApiRef } from '../../api/CoderClient';
import {
  getMockConfigApi,
  getMockDiscoveryApi,
  getMockIdentityApi,
  mockCoderAuthToken,
} from '../../testHelpers/mockBackstageData';
import { UrlSync } from '../../api/UrlSync';
import { TestApiProvider } from '@backstage/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { getMockQueryClient } from '../../testHelpers/setup';

afterEach(() => {
  jest.clearAllMocks();
});

function renderAuthProvider(children: ReactNode) {
  const urlSync = new UrlSync({
    apis: {
      configApi: getMockConfigApi(),
      discoveryApi: getMockDiscoveryApi(),
    },
  });

  const identityApi = getMockIdentityApi();

  // Can't use initialToken property, because then the Auth provider won't be
  // aware of it. When testing for UI authentication, we need to feed the token
  // from localStorage to the provider, which then feeds it to the client while
  // keeping track of the React state changes
  const coderClient = new CoderClient({
    apis: { urlSync, identityApi },
  });

  const mockAppRoot = document.createElement('div');
  mockAppRoot.id = BACKSTAGE_APP_ROOT_ID;
  document.body.append(mockAppRoot);

  const queryClient = getMockQueryClient();
  const renderResult = render(
    <TestApiProvider apis={[[coderClientApiRef, coderClient]]}>
      <QueryClientProvider client={queryClient}>
        <CoderAuthProvider>{children}</CoderAuthProvider>
      </QueryClientProvider>
    </TestApiProvider>,
    {
      baseElement: mockAppRoot,
    },
  );

  return { ...renderResult, coderClient };
}

describe(`${CoderAuthProvider.name}`, () => {
  /**
   * @todo Figure out what general auth state logic could benefit from tests
   * and put them in a separate describe block
   */
  describe('Fallback auth input', () => {
    const fallbackTriggerMatcher = /Authenticate with Coder/;

    function MockTrackedComponent() {
      const auth = useInternalCoderAuth();
      return <p>Authenticated? {auth.isAuthenticated ? 'Yes!' : 'No...'}</p>;
    }

    function MockEndUserComponent() {
      const auth = useEndUserCoderAuth();
      return <p>Authenticated? {auth.isAuthenticated ? 'Yes!' : 'No...'}</p>;
    }

    async function waitForNAuthenticatedComponents(n: number) {
      await waitFor(() => {
        const authenticatedComponents = screen.getAllByText(/Yes!/);
        expect(authenticatedComponents.length).toBe(n);
      });
    }

    it('Will never display the auth fallback if the user is already authenticated', async () => {
      const originalGetItem = global.Storage.prototype.getItem;
      jest
        .spyOn(global.Storage.prototype, 'getItem')
        .mockImplementation(key => {
          if (key === TOKEN_STORAGE_KEY) {
            return mockCoderAuthToken;
          }

          return originalGetItem(key);
        });

      renderAuthProvider(
        <>
          <MockTrackedComponent />
          <MockEndUserComponent />
        </>,
      );

      await waitForNAuthenticatedComponents(2);
      const authFallbackTrigger = screen.queryByRole('button', {
        name: fallbackTriggerMatcher,
      });

      expect(authFallbackTrigger).not.toBeInTheDocument();
    });

    it('Will display an auth fallback input when there are no Coder components to be tracked and does not consider users of', async () => {
      renderAuthProvider(<></>);
      const authFallbackTrigger = await screen.findByRole('button', {
        name: fallbackTriggerMatcher,
      });

      expect(authFallbackTrigger).toBeInTheDocument();
    });

    it('Will never display the auth fallback if there are components being tracked', () => {
      renderAuthProvider(<MockTrackedComponent />);
      const authFallbackTrigger = screen.queryByRole('button', {
        name: fallbackTriggerMatcher,
      });

      expect(authFallbackTrigger).not.toBeInTheDocument();
    });

    it(`Does not consider users of ${useEndUserCoderAuth.name} when deciding whether to show fallback auth UI`, async () => {
      renderAuthProvider(<MockEndUserComponent />);
      const authFallbackTrigger = await screen.findByRole('button', {
        name: fallbackTriggerMatcher,
      });

      expect(authFallbackTrigger).toBeInTheDocument();
    });

    it.skip('Lets the user go through a full authentication flow via the fallback auth UI', () => {
      expect.hasAssertions();
    });
  });
});
