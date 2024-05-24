/**
 * @file Ideally all the files in CoderProvider could be treated as
 * implementation details, and we could have a single test file for all the
 * pieces joined together.
 *
 * But because the auth is so complicated, it helps to have tests just for it.
 *
 * ---
 * @todo 2024-05-23 - Right now, there is a conflict when you try to call
 * Backstage's wrapInTestApp and also try to mock out localStorage. They
 * interact in such a way that when you call your mock's getItem method, it
 * immediately throws an error. Didn't want to get rid of wrapInTestApp, because
 * then that would require removing official Backstage components. wrapInTestApp
 * sets up a lot of things behind the scenes like React Router that these
 * components rely on.
 *
 * Figured out a way to write the tests that didn't involve extra mocking, but
 * it's not as airtight as it could be. Definitely worth opening an issue with
 * the Backstage repo upstream.
 */
import React, { type ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  mockAppConfig,
  mockCoderAuthToken,
} from '../../testHelpers/mockBackstageData';
import { UrlSync } from '../../api/UrlSync';
import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { getMockQueryClient } from '../../testHelpers/setup';
import userEvent from '@testing-library/user-event';
import { CoderAppConfigProvider } from './CoderAppConfigProvider';

afterEach(() => {
  jest.restoreAllMocks();

  const appRootNodes = document.querySelectorAll(BACKSTAGE_APP_ROOT_ID);
  appRootNodes.forEach(node => node.remove());
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
});

function renderAuthProvider(children?: ReactNode) {
  const urlSync = new UrlSync({
    apis: {
      configApi: getMockConfigApi(),
      discoveryApi: getMockDiscoveryApi(),
    },
  });

  const queryClient = getMockQueryClient();
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

  return render(
    <TestApiProvider apis={[[coderClientApiRef, coderClient]]}>
      <QueryClientProvider client={queryClient}>
        <CoderAppConfigProvider appConfig={mockAppConfig}>
          <CoderAuthProvider>{children}</CoderAuthProvider>
        </CoderAppConfigProvider>
      </QueryClientProvider>
    </TestApiProvider>,
    {
      baseElement: mockAppRoot,
      wrapper: ({ children }) => wrapInTestApp(children),
    },
  );
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

    it('Will never display the auth fallback if the user is already authenticated', async () => {
      /**
       * Not 100% sure on why this works. We load the token in before rendering,
       * so that we can bring the token into the UI on the initial render
       *
       * But as part of that rendering, wrapInTestApp eventually replaces
       * localStorage with a mock. So the initial state is getting carried over
       * to the mock? Or maybe it's not really a full mock and is just a spy?
       */
      window.localStorage.setItem(TOKEN_STORAGE_KEY, mockCoderAuthToken);

      renderAuthProvider(
        <>
          <MockTrackedComponent />
          <MockEndUserComponent />
        </>,
      );

      await waitFor(() => {
        const authenticatedComponents = screen.getAllByText(/Yes!/);
        expect(authenticatedComponents).toHaveLength(2);
      });

      const authFallbackTrigger = screen.queryByRole('button', {
        name: fallbackTriggerMatcher,
      });

      expect(authFallbackTrigger).not.toBeInTheDocument();
    });

    it('Will display an auth fallback input when there are no Coder components to be tracked and does not consider users of', async () => {
      renderAuthProvider();
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

    it('Lets the user go through a full authentication flow via the fallback auth UI', async () => {
      renderAuthProvider();
      const user = userEvent.setup();

      const authFallbackTrigger = await screen.findByRole('button', {
        name: fallbackTriggerMatcher,
      });

      await user.click(authFallbackTrigger);
      const authForm = await screen.findByRole('form', {
        name: /Authenticate with Coder/,
      });

      const tokenInput = await within(authForm).findByLabelText(/Auth token/);
      await user.type(tokenInput, mockCoderAuthToken);

      const submitButton = await within(authForm).findByRole('button', {
        name: /Authenticate/,
      });

      await user.click(submitButton);
      expect(authForm).not.toBeInTheDocument();
    });
  });
});
