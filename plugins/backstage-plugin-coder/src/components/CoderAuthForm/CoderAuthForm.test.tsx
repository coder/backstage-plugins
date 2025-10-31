import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import type { CoderAuth, CoderAuthStatus } from '../CoderProvider';
import {
  mockAuthStates,
  mockCoderAuthToken,
} from '../../testHelpers/mockBackstageData';
import { CoderAuthForm } from './CoderAuthForm';

type RenderInputs = Readonly<{
  authStatus: CoderAuthStatus;
}>;

async function renderAuthWrapper({ authStatus }: RenderInputs) {
  const unlinkToken = jest.fn();
  const registerNewToken = jest.fn();

  const auth: CoderAuth = {
    ...mockAuthStates[authStatus],
    unlinkToken,
    registerNewToken,
  };

  /**
   * @todo RTL complains about the current environment not being configured to
   * support act. Luckily, it doesn't cause any of our main test cases to kick
   * up false positives.
   *
   * This may not be an issue with our code, and might be a bug from Backstage's
   * migration to React 18. Need to figure out where this issue is coming from,
   * and open an issue upstream if necessary
   */
  const renderOutput = await renderInCoderEnvironment({
    children: <CoderAuthForm />,
    auth: auth,
  });

  return { ...renderOutput, unlinkToken, registerNewToken };
}

describe(`${CoderAuthForm.name}`, () => {
  describe('Loading UI', () => {
    it('Is displayed while the auth is initializing', async () => {
      renderAuthWrapper({ authStatus: 'initializing' });
      const loadingIndicator = await screen.findByText(/Loading/);
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  describe('Token distrusted form', () => {
    it("Is displayed when the user's auth status cannot be verified", async () => {
      const distrustedTextMatcher = /Unable to verify token authenticity/;
      const distrustedStatuses: readonly CoderAuthStatus[] = [
        'distrusted',
        'noInternetConnection',
        'deploymentUnavailable',
      ];

      for (const authStatus of distrustedStatuses) {
        const { unmount } = await renderAuthWrapper({ authStatus });
        const message = await screen.findByText(distrustedTextMatcher);

        expect(message).toBeInTheDocument();
        unmount();
      }
    });

    it('Lets the user unlink the current token', async () => {
      const { unlinkToken } = await renderAuthWrapper({
        authStatus: 'distrusted',
      });

      const user = userEvent.setup();
      const unlinkButton = await screen.findByRole('button', {
        name: /Unlink Coder account/,
      });

      await user.click(unlinkButton);
      expect(unlinkToken).toHaveBeenCalled();
    });
  });

  describe('Token submission form', () => {
    it("Is displayed when the token either doesn't exist or is definitely not valid", async () => {
      const statusesForInvalidUser: readonly CoderAuthStatus[] = [
        'invalid',
        'tokenMissing',
      ];

      for (const authStatus of statusesForInvalidUser) {
        const { unmount } = await renderAuthWrapper({ authStatus });
        const form = screen.getByRole('form', {
          name: /Authenticate with Coder/,
        });

        expect(form).toBeInTheDocument();
        unmount();
      }
    });

    it('Lets the user submit a new access token', async () => {
      const { registerNewToken } = await renderAuthWrapper({
        authStatus: 'tokenMissing',
      });

      /**
       * Two concerns that make the selection for inputField a little hokey:
       * 1. The auth input is of type password, which does not have a role
       *    compatible with Testing Library; can't use getByRole to select it
       * 2. MUI adds a star to its labels that are required, meaning that any
       *    attempts at trying to match string literal "Auth token" will fail;
       *    have to use a regex selector
       */
      const inputField = screen.getByLabelText(/Auth token/);
      const submitButton = screen.getByRole('button', { name: 'Use token' });

      const user = userEvent.setup();
      await user.click(inputField);
      await user.keyboard(mockCoderAuthToken);
      await user.click(submitButton);

      expect(registerNewToken).toHaveBeenCalledWith(mockCoderAuthToken);
    });

    it('Lets the user dismiss any notifications for invalid/authenticating states', async () => {
      const authStatuses: readonly CoderAuthStatus[] = [
        'invalid',
        'authenticating',
      ];

      const user = userEvent.setup();
      for (const authStatus of authStatuses) {
        const { unmount } = await renderAuthWrapper({ authStatus });
        const dismissButton = await screen.findByRole('button', {
          name: 'Dismiss',
        });

        await user.click(dismissButton);
        await waitFor(() => expect(dismissButton).not.toBeInTheDocument());
        unmount();
      }
    });
  });
});
