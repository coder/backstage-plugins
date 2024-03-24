import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { ExtraActionsButton } from './ExtraActionsButton';
import { mockAppConfig } from '../../testHelpers/mockBackstageData';
import type { CoderAppConfig } from '../CoderProvider';

function render() {
  // const appConfig: CoderAppConfig = { ...mockAppConfig, "workspaces": {
  //     ...mockAppConfig.workspaces,
  //     ""
  // }  }
}

describe(`${ExtraActionsButton.name}`, () => {
  /**
   * 1. Hovering over the button displays a tooltip
   * 2. Pressing the refresh buttons a bunch of times properly throttles the
   *    calls.
   * 3. Will dispatch calls to outer onClick handler
   * 4. Using keyboard navigation to jump between menu items works just fine
   * 5.
   */

  it("Doesn't blow up", () => {
    expect({}).toBeTruthy();
  });
});
