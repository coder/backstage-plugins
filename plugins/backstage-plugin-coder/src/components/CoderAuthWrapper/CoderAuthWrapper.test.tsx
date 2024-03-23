import React from 'react';
import { screen } from '@testing-library/react';
import { CoderProviderWithMockAuth } from '../../testHelpers/setup';
import type { CoderAuthStatus } from '../CoderProvider';
import { mockAppConfig } from '../../testHelpers/mockBackstageData';
import { CoderAuthWrapper } from './CoderAuthWrapper';
import { renderInTestApp } from '@backstage/test-utils';

type RenderInputs = Readonly<{
  dummyButtonText: string;
  authStatus: CoderAuthStatus;
}>;

function renderAuthWrapper({ dummyButtonText, authStatus }: RenderInputs) {
  /**
   * @todo RTL complains about the current environment not being configured to
   * support act. Luckily, it doesn't cause any of our main test cases to kick
   * up false positives.
   *
   * This may not be an issue with our code, and might be a bug from Backstage's
   * migration to React 18. Need to figure out where this issue is coming from,
   * and open an issue upstream if necessary
   */
  return renderInTestApp(
    <CoderProviderWithMockAuth
      appConfig={mockAppConfig}
      authStatus={authStatus}
    >
      <CoderAuthWrapper type="card">
        <button>{dummyButtonText}</button>
      </CoderAuthWrapper>
    </CoderProviderWithMockAuth>,
  );
}

describe(`${CoderAuthWrapper.name}`, () => {
  describe('Displaying main content', () => {
    it('Displays the main children when the user is authenticated', async () => {
      const buttonText = 'I have secret Coder content!';
      renderAuthWrapper({
        authStatus: 'authenticated',
        dummyButtonText: buttonText,
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
        dummyButtonText: buttonText,
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
      const distrustedStatuses: readonly CoderAuthStatus[] = [
        'distrusted',
        'noInternetConnection',
        'deploymentUnavailable',
      ];

      for (const status of distrustedStatuses) {
        const { unmount } = await renderAuthWrapper({
          authStatus: status,
          dummyButtonText: buttonText,
        });

        await screen.findByText(distrustedTextMatcher);
        const button = screen.queryByRole('button', { name: buttonText });
        expect(button).not.toBeInTheDocument();

        unmount();
      }
    });

    it('Lets the user eject the current token', async () => {
      expect.hasAssertions();
    });

    it('Will appear if auth status changes during re-renders', async () => {
      expect.hasAssertions();
    });
  });

  describe('Token submission form', () => {
    it("Is displayed when the token either doesn't exist or is definitely not valid", async () => {
      expect.hasAssertions();
    });

    it("Submitting a new token causes the component's children to appear", async () => {
      expect.hasAssertions();
    });
  });
});
