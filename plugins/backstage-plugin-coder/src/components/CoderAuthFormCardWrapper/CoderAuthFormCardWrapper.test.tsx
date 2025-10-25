import { screen } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import type { CoderAuthStatus } from '../CoderProvider';
import { mockAuthStates } from '../../testHelpers/mockBackstageData';
import { CoderAuthFormCardWrapper } from './CoderAuthFormCardWrapper';

type RenderInputs = Readonly<{
  authStatus: CoderAuthStatus;
  childButtonText: string;
}>;

async function renderAuthWrapper({
  authStatus,
  childButtonText,
}: RenderInputs) {
  return renderInCoderEnvironment({
    children: (
      <CoderAuthFormCardWrapper>
        <button>{childButtonText}</button>
      </CoderAuthFormCardWrapper>
    ),
    auth: mockAuthStates[authStatus],
  });
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

  it('Will go back to hiding content if auth state becomes invalid after re-renders', async () => {
    const buttonText = "Now you see me, now you don't";
    const { rerender } = await renderAuthWrapper({
      authStatus: 'authenticated',
      childButtonText: buttonText,
    });

    // Capture button after it first appears on the screen; findBy will throw if
    // the button is not actually visible
    const button = await screen.findByRole('button', { name: buttonText });

    rerender(
      <CoderAuthFormCardWrapper>
        <button>{buttonText}</button>
      </CoderAuthFormCardWrapper>,
    );

    // Assert that the button is gone after the re-render flushes
    expect(button).not.toBeInTheDocument();
  });
});
