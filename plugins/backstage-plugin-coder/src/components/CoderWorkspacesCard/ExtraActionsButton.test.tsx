import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockAuthStates } from '../../testHelpers/mockBackstageData';
import type { CoderAuth } from '../CoderProvider';
import { Root } from './Root';
import { ExtraActionsButton } from './ExtraActionsButton';

type RenderInputs = Readonly<{
  buttonText: string;
}>;

async function renderButton({ buttonText }: RenderInputs) {
  const ejectToken = jest.fn();
  const auth: CoderAuth = { ...mockAuthStates.authenticated, ejectToken };

  const renderOutput = await renderInCoderEnvironment({
    auth,
    children: (
      <Root>
        <ExtraActionsButton tooltipText={buttonText} />
      </Root>
    ),
  });

  const button = screen.getByRole('button', {
    name: new RegExp(buttonText),
  });

  return {
    ...renderOutput,
    button,
    unlinkCoderAccount: ejectToken,
  };
}

describe(`${ExtraActionsButton.name}`, () => {
  // Can include onClick prop test in this test case, too
  it('Will open a menu of actions when the main button is clicked', async () => {
    const { button } = await renderButton({ buttonText: 'Button' });
    const user = userEvent.setup();

    await user.click(button);
    expect(() => {
      screen.getByRole('menuitem', {
        name: /Unlink Coder account/i,
      });

      screen.getByRole('menuitem', {
        name: /Refresh/i,
      });
    }).not.toThrow();
  });

  it('Displays a tooltip when the user hovers over it', async () => {
    const tooltipText = 'Hover test';
    const user = userEvent.setup();
    const { button } = await renderButton({
      buttonText: 'Hover test',
    });

    await user.hover(button);
    const tooltip = await screen.findByText(tooltipText);
    expect(tooltip).toBeInTheDocument();
  });

  it('Can unlink the current Coder session token', async () => {
    const user = userEvent.setup();
    const { button, unlinkCoderAccount } = await renderButton({
      buttonText: 'Unlink test',
    });

    await user.click(button);
    const unlinkMenuItem = await screen.findByRole('menuitem', {
      name: /Unlink Coder account/i,
    });

    await user.click(unlinkMenuItem);
    expect(unlinkCoderAccount).toHaveBeenCalled();
  });

  it.only('Lets users trigger actions entirely through the keyboard', async () => {
    const { button, unlinkCoderAccount } = await renderButton({
      buttonText: 'Keyboard test',
    });

    expect.hasAssertions();
  });

  // Ideas that come to mind for testing the refetch functionality:
  // 1. Export the Context Provider from Root, and wire it up with a mock query
  //    object value
  // 2. Figure out a way to mock the API functions
  it('Can refetch the workspaces data', async () => {
    expect.hasAssertions();
  });

  it('Will throttle repeated called to the refetch functionality', async () => {
    expect.hasAssertions();
  });
});
