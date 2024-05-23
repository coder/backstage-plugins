import React from 'react';
import { screen } from '@testing-library/react';
import { CoderProviderWithMockAuth } from '../../testHelpers/setup';
import type { CoderAuthStatus } from '../CoderProvider';
import {
  mockAppConfig,
  mockAuthStates,
} from '../../testHelpers/mockBackstageData';
import { CoderAuthFormCardWrapper } from './CoderAuthFormCardWrapper';
import { renderInTestApp } from '@backstage/test-utils';

type RenderInputs = Readonly<{
  authStatus: CoderAuthStatus;
  childButtonText: string;
}>;

async function renderAuthWrapper({
  authStatus,
  childButtonText,
}: RenderInputs) {
  /**
   * @todo RTL complains about the current environment not being configured to
   * support act. Luckily, it doesn't seem to be making any of our main test
   * cases to kick up false positives.
   *
   * This may not be an issue with our code, and might be a bug from Backstage's
   * migration to React 18. Need to figure out where this issue is coming from,
   * and open an issue upstream if necessary
   */
  return renderInTestApp(
    <CoderProviderWithMockAuth
      appConfig={mockAppConfig}
      auth={mockAuthStates[authStatus]}
    >
      <CoderAuthFormCardWrapper>
        <button>{childButtonText}</button>
      </CoderAuthFormCardWrapper>
    </CoderProviderWithMockAuth>,
  );
}

describe(`${CoderAuthFormCardWrapper.name}`, () => {
  it('Displays the main children when the user is authenticated', async () => {
    const childButtonText = 'I have secret Coder content!';
    const validStatuses: readonly CoderAuthStatus[] = [
      'authenticated',
      'distrustedWithGracePeriod',
    ];

    for (const authStatus of validStatuses) {
      const { unmount } = await renderAuthWrapper({
        authStatus,
        childButtonText,
      });

      const button = await screen.findByRole('button', {
        name: childButtonText,
      });

      // This assertion isn't necessary because findByRole will throw an error
      // if the button can't be found within the expected period of time. Doing
      // this purely to make the Backstage linter happy
      expect(button).toBeInTheDocument();
      unmount();
    }
  });

  it('Hides the main children for any invalid/untrustworthy auth status', async () => {
    const childButtonText = 'I should never be visible on the screen!';
    const invalidStatuses: readonly CoderAuthStatus[] = [
      'deploymentUnavailable',
      'distrusted',
      'initializing',
      'invalid',
      'noInternetConnection',
      'tokenMissing',
    ];

    for (const authStatus of invalidStatuses) {
      const { unmount } = await renderAuthWrapper({
        authStatus,
        childButtonText,
      });

      const button = screen.queryByRole('button', { name: childButtonText });
      expect(button).not.toBeInTheDocument();
      unmount();
    }
  });
});
