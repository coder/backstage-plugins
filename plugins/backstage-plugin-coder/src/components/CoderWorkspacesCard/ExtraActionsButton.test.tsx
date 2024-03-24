import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getMockQueryClient,
  renderInCoderEnvironment,
} from '../../testHelpers/setup';
import { ExtraActionsButton } from './ExtraActionsButton';
import {
  mockAppConfig,
  mockAuthStates,
} from '../../testHelpers/mockBackstageData';
import type {
  CoderAppConfig,
  CoderAuth,
  CoderAuthStatus,
} from '../CoderProvider';
import { Root } from './Root';

// Ideas that come to mind for testing the refetch functionality:
// 1. Export the Context Provider from Root, and wire it up with a mock query
//    object value
// 2. Figure out a way to mock the API functions
function render(children: React.ReactNode) {
  const ejectToken = jest.fn();

  const auth: CoderAuth = { ...mockAuthStates.authenticated, ejectToken };
  const renderOutput = renderInCoderEnvironment({
    auth,
    children: (
      <Root>
        <ExtraActionsButton />
      </Root>
    ),
  });

  return { ...renderOutput, ejectToken };
}

describe.skip(`${ExtraActionsButton.name}`, () => {
  // Can include onClick prop test in this test case, too
  it('Will open a menu of actions when the main button is clicked', async () => {
    expect.hasAssertions();
  });

  it('Displays a tooltip when the user hovers over it', async () => {
    expect.hasAssertions();
  });

  it('Lets users trigger actions entirely through keyboard', async () => {
    expect.hasAssertions();
  });

  it('Can unlink the current Coder session token', async () => {
    expect.hasAssertions();
  });

  it('Can refetch the workspaces data', async () => {
    expect.hasAssertions();
  });

  it('Will throttle repeated called to the refetch functionality', async () => {
    expect.hasAssertions();
  });
});
