import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoderProviderWithMockAuth } from '../../testHelpers/setup';
import type { CoderTokenAuthUiStatus } from '../../hooks/useCoderTokenAuth';
import {
  mockAppConfig,
  mockAuthStates,
  mockCoderAuthToken,
} from '../../testHelpers/mockBackstageData';
import { CoderAuthWrapper } from './CoderAuthWrapper';
import { renderInTestApp } from '@backstage/test-utils';
import { CoderTokenAuth } from '../../api/CoderTokenAuth';

type RenderInputs = Readonly<{
  authStatus: CoderTokenAuthUiStatus;
  childButtonText?: string;
}>;

async function renderAuthWrapper({
  authStatus,
  childButtonText = 'Default button text',
}: RenderInputs) {
  const ejectToken = jest.fn();
  const registerNewToken = jest.fn();

  const auth: CoderTokenAuth = {
    ...mockAuthStates[authStatus],
    ejectToken,
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
  const renderOutput = await renderInTestApp(
    <CoderProviderWithMockAuth appConfig={mockAppConfig} auth={auth}>
      <CoderAuthWrapper type="card">
        <button>{childButtonText}</button>
      </CoderAuthWrapper>
    </CoderProviderWithMockAuth>,
  );

  return { ...renderOutput, ejectToken, registerNewToken };
}

describe(`${CoderAuthWrapper.name}`, () => {
  describe('Displaying main content', () => {
    it('Displays the main children when the user is authenticated', async () => {
      const buttonText = 'I have secret Coder content!';
      renderAuthWrapper({
        authStatus: 'authenticated',
        childButtonText: buttonText,
      });

      const button = await screen.findByRole('button', { name: buttonText });

      // This assertion isn't necessary because findByRole will throw an error
      // if the button can't be found within the expected period of time. Doing
      // this purely to make the Backstage linter happy
      expect(button).toBeInTheDocument();
    });
  });

  describe('Loading UI', () => {
    it('Is displayed while the auth is initializing', async () => {
      const buttonText = "You shouldn't be able to see me!";
      renderAuthWrapper({
        authStatus: 'initializing',
        childButtonText: buttonText,
      });

      await screen.findByText(/Loading/);
      const button = screen.queryByRole('button', { name: buttonText });
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Token distrusted form', () => {
    it("Is displayed when the user's auth status cannot be verified", async () => {
      const buttonText = 'Not sure if you should be able to see me';
      const distrustedTextMatcher = /Unable to verify token authenticity/;
      const distrustedStatuses: readonly CoderTokenAuthUiStatus[] = [
        'distrusted',
        'noInternetConnection',
        'deploymentUnavailable',
      ];

      for (const status of distrustedStatuses) {
        const { unmount } = await renderAuthWrapper({
          authStatus: status,
          childButtonText: buttonText,
        });

        await screen.findByText(distrustedTextMatcher);
        const button = screen.queryByRole('button', { name: buttonText });
        expect(button).not.toBeInTheDocument();

        unmount();
      }
    });

    it('Lets the user eject the current token', async () => {
      const { ejectToken } = await renderAuthWrapper({
        authStatus: 'distrusted',
      });

      const user = userEvent.setup();
      const ejectButton = await screen.findByRole('button', {
        name: 'Eject token',
      });

      await user.click(ejectButton);
      expect(ejectToken).toHaveBeenCalled();
    });

    it('Will appear if auth status changes during re-renders', async () => {
      const buttonText = "Now you see me, now you don't";
      const { rerender } = await renderAuthWrapper({
        authStatus: 'authenticated',
        childButtonText: buttonText,
      });

      // Capture button after it first appears on the screen
      const button = await screen.findByRole('button', { name: buttonText });

      rerender(
        <CoderProviderWithMockAuth
          appConfig={mockAppConfig}
          authStatus="distrusted"
        >
          <CoderAuthWrapper type="card">
            <button>{buttonText}</button>
          </CoderAuthWrapper>
        </CoderProviderWithMockAuth>,
      );

      // Assert that the button is now gone
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Token submission form', () => {
    it("Is displayed when the token either doesn't exist or is definitely not valid", async () => {
      const buttonText = "You're not allowed to gaze upon my visage";
      const tokenFormMatcher = /Please enter a new token/;
      const statusesForInvalidUser: readonly CoderTokenAuthUiStatus[] = [
        'invalid',
        'tokenMissing',
      ];

      for (const status of statusesForInvalidUser) {
        const { unmount } = await renderAuthWrapper({
          authStatus: status,
          childButtonText: buttonText,
        });

        await screen.findByText(tokenFormMatcher);
        const button = screen.queryByRole('button', { name: buttonText });
        expect(button).not.toBeInTheDocument();

        unmount();
      }
    });

    it('Lets the user submit a new token', async () => {
      const { registerNewToken } = await renderAuthWrapper({
        authStatus: 'tokenMissing',
      });

      /**
       * Two concerns that make the selection for inputField a little hokey:
       * 1. The auth input is of type password, which does not have a role
       *    compatible with Testing Library; can't use getByRole to select it
       * 2. MUI adds a star to its labels that are required, meaning that any
       *    attempts at trying to match the string "Auth token" will fail
       */
      const inputField = screen.getByLabelText(/Auth token/);
      const submitButton = screen.getByRole('button', { name: 'Authenticate' });

      const user = userEvent.setup();
      await user.click(inputField);
      await user.keyboard(mockCoderAuthToken);
      await user.click(submitButton);

      expect(registerNewToken).toHaveBeenCalledWith(mockCoderAuthToken);
    });

    it('Lets the user dismiss any notifications for invalid/authenticating states', async () => {
      const authStatuses: readonly CoderTokenAuthUiStatus[] = [
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
