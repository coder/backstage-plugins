import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import {
  mockAuthStates,
  mockCoderWorkspacesConfig,
} from '../../testHelpers/mockBackstageData';
import type { CoderTokenUiAuth } from '../../hooks/useCoderTokenAuth';
import { CardContext, WorkspacesCardContext } from './Root';
import { ExtraActionsButton } from './ExtraActionsButton';

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

function getUser() {
  return userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });
}

type RenderInputs = Readonly<{
  buttonText: string;
}>;

async function renderButton({ buttonText }: RenderInputs) {
  const ejectToken = jest.fn();
  const auth: CoderTokenUiAuth = {
    ...mockAuthStates.authenticated,
    ejectToken,
  };

  /**
   * Pretty sure there has to be a more elegant and fault-tolerant way of
   * testing the useQuery functionality, but this does the trick for now
   *
   * @todo Research how to test dependencies on useQuery
   */
  const refetch = jest.fn();
  const mockContext: Partial<WorkspacesCardContext> = {
    workspacesConfig: mockCoderWorkspacesConfig,
    workspacesQuery: {
      refetch,
    } as unknown as WorkspacesCardContext['workspacesQuery'],
  };

  const renderOutput = await renderInCoderEnvironment({
    auth,
    children: (
      <CardContext.Provider value={mockContext as WorkspacesCardContext}>
        <ExtraActionsButton tooltipText={buttonText} />
      </CardContext.Provider>
    ),
  });

  return {
    ...renderOutput,
    button: screen.getByRole('button', { name: new RegExp(buttonText) }),
    unlinkCoderAccount: ejectToken,
    refreshWorkspaces: refetch,
  };
}

describe(`${ExtraActionsButton.name}`, () => {
  // Can include onClick prop test in this test case, too
  it('Will open a menu of actions when the main button is clicked', async () => {
    const { button } = await renderButton({ buttonText: 'Button' });
    const user = getUser();

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
    const user = getUser();
    const { button } = await renderButton({
      buttonText: 'Hover test',
    });

    await user.hover(button);
    const tooltip = await screen.findByText(tooltipText);
    expect(tooltip).toBeInTheDocument();
  });

  it('Can unlink the current Coder session token', async () => {
    const user = getUser();
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

  it('Lets users trigger actions entirely through the keyboard', async () => {
    const tooltipText = 'Keyboard test';
    const { button, unlinkCoderAccount } = await renderButton({
      buttonText: tooltipText,
    });

    const user = getUser();
    await user.keyboard('[Tab]');
    expect(button).toHaveFocus();

    await user.keyboard('[Enter]');
    const menuItems = await screen.findAllByRole('menuitem');
    expect(menuItems[0]).toHaveFocus();

    const unlinkItem = screen.getByRole('menuitem', {
      name: /Unlink Coder account/i,
    });

    while (document.activeElement !== unlinkItem) {
      await user.keyboard('[ArrowDown]');
    }

    await user.keyboard('[Enter]');
    expect(unlinkCoderAccount).toHaveBeenCalled();
  });

  it('Can refresh the workspaces data', async () => {
    const user = getUser();
    const { button, refreshWorkspaces } = await renderButton({
      buttonText: 'Refresh test',
    });

    await user.click(button);
    const refreshItem = await screen.findByRole('menuitem', {
      name: /Refresh/i,
    });

    await user.click(refreshItem);
    expect(refreshWorkspaces).toHaveBeenCalled();
  });

  it('Will throttle repeated clicks on the Refresh menu item', async () => {
    const user = getUser();
    const refreshMatcher = /Refresh/i;
    const { button, refreshWorkspaces } = await renderButton({
      buttonText: 'Throttle test',
    });

    // The menu is programmed to auto-close every time you choose an option;
    // have to do a lot of clicks to verify that things are throttled
    for (let i = 0; i < 10; i++) {
      await user.click(button);

      // Can't store this in a variable outside the loop, because the item will
      // keep mounting/unmounting every time the menu opens/closes. The memory
      // reference will keep changing
      const refreshItem = screen.getByRole('menuitem', {
        name: refreshMatcher,
      });

      await user.click(refreshItem);
    }

    await jest.advanceTimersByTimeAsync(10_000);
    expect(refreshWorkspaces).toHaveBeenCalledTimes(1);
  });
});
