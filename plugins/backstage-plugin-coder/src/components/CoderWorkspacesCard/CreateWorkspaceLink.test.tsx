import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  mockAppConfig,
  mockCoderWorkspacesConfig,
} from '../../testHelpers/mockBackstageData';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { CardContext, WorkspacesCardContext } from './Root';
import { CreateWorkspaceLink } from './CreateWorkspaceLink';
import type { CoderWorkspacesConfig } from '../../hooks/useCoderWorkspacesConfig';

type RenderInputs = Readonly<{
  hasTemplateName?: boolean;
}>;

function render(inputs?: RenderInputs) {
  const { hasTemplateName = true } = inputs ?? {};

  const mockWorkspacesConfig: CoderWorkspacesConfig = {
    ...mockCoderWorkspacesConfig,
    creationUrl: hasTemplateName
      ? mockCoderWorkspacesConfig.creationUrl
      : undefined,
  };

  const mockContextValue: WorkspacesCardContext = {
    workspacesConfig: mockWorkspacesConfig,
    headerId: "Doesn't matter",
    queryFilter: "Also doesn't matter",
    onFilterChange: jest.fn(),
    workspacesQuery:
      null as unknown as WorkspacesCardContext['workspacesQuery'],
  };

  return renderInCoderEnvironment({
    children: (
      <CardContext.Provider value={mockContextValue}>
        <CreateWorkspaceLink />
      </CardContext.Provider>
    ),
  });
}

describe(`${CreateWorkspaceLink.name}`, () => {
  it('Displays a link based on the current entity', async () => {
    await render();
    const link = screen.getByRole<HTMLAnchorElement>('link');

    expect(link).not.toBeDisabled();
    expect(link.target).toEqual('_blank');
    expect(link.href).toMatch(
      new RegExp(`^${mockAppConfig.deployment.accessUrl}/`),
    );
  });

  it('Will display a tooltip while hovered over', async () => {
    await render();
    const link = screen.getByRole<HTMLAnchorElement>('link');
    const user = userEvent.setup();

    await user.hover(link);
    const tooltip = await screen.findByText('Add a new workspace');
    expect(tooltip).toBeInTheDocument();
  });

  it('Will be disabled and will indicate to the user when there is no usable templateName value', async () => {
    await render({ hasTemplateName: false });
    const link = screen.getByRole<HTMLAnchorElement>('link');

    // Check that the link is "disabled" properly (see main component file for
    // a link to resource explaining edge cases). Can't assert toBeDisabled,
    // because links don't support the disabled attribute; also can't check
    // the .role and .ariaDisabled properties on the link variable, because even
    // though they exist in the output, RTL doesn't correctly pass them through.
    // This is a niche edge case - have to check properties on the raw HTML node
    expect(link.href).toBe('');
    expect(link.getAttribute('role')).toBe('link');
    expect(link.getAttribute('aria-disabled')).toBe('true');

    // Make sure tooltip is also updated
    const user = userEvent.setup();
    await user.hover(link);
    const tooltip = await screen.findByText('Please add a template name value');
    expect(tooltip).toBeInTheDocument();
  });
});
