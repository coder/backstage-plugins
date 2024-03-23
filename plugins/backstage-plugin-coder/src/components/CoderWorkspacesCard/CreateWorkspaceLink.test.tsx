import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockAppConfig } from '../../testHelpers/mockBackstageData';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { Root } from './Root';
import { CreateWorkspaceLink } from './CreateWorkspaceLink';

function render() {
  return renderInCoderEnvironment(
    <Root>
      <CreateWorkspaceLink />
    </Root>,
  );
}

describe(`${CreateWorkspaceLink.name}`, () => {
  it('Displays a link based on the current entity', async () => {
    render();
    const link = await screen.findByRole<HTMLAnchorElement>('link');

    expect(link).not.toBeDisabled();
    expect(link.target).toEqual('_blank');
    expect(link.href).toMatch(
      new RegExp(`^${mockAppConfig.deployment.accessUrl}/`),
    );
  });

  it('Will display a tooltip while hovered over', async () => {
    render();
    const link = await screen.findByRole<HTMLAnchorElement>('link');
    const user = userEvent.setup();

    await user.hover(link);
    const tooltip = await screen.findByText('Add a new workspace');
    expect(tooltip).toBeInTheDocument();
  });
});
