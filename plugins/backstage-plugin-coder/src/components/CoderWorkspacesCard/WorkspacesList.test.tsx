import React from 'react';
import { type WorkspacesListProps, WorkspacesList } from './WorkspacesList';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { CardContext, WorkspacesCardContext, WorkspacesQuery } from './Root';
import { mockCoderWorkspacesConfig } from '../../testHelpers/mockBackstageData';
import { mockWorkspaceWithMatch } from '../../testHelpers/mockCoderAppData';
import type { Workspace } from '../../api/vendoredSdk';
import { screen } from '@testing-library/react';

type RenderInputs = Readonly<{
  workspacesQuery: Partial<WorkspacesQuery>;
  renderListItem?: WorkspacesListProps['renderListItem'];
  repoUrl?: string;
}>;

function renderWorkspacesList(inputs?: RenderInputs) {
  const { renderListItem, workspacesQuery, repoUrl } = inputs ?? {};
  const mockContext: Partial<WorkspacesCardContext> = {
    workspacesQuery: workspacesQuery as WorkspacesQuery,
    workspacesConfig: {
      ...mockCoderWorkspacesConfig,
      repoUrl,
    },
  };

  return renderInCoderEnvironment({
    children: (
      <CardContext.Provider value={mockContext as WorkspacesCardContext}>
        <WorkspacesList renderListItem={renderListItem} />
      </CardContext.Provider>
    ),
  });
}

/**
 * Deferring a lot of functionality tests to CoderWorkspacesCard.test.tsx
 */
describe(`${WorkspacesList.name}`, () => {
  it('Allows the user to provide their own callback for iterating through each item', async () => {
    const workspaceNames = ['dog', 'cat', 'bird'];
    await renderWorkspacesList({
      repoUrl: mockCoderWorkspacesConfig.repoUrl,
      workspacesQuery: {
        data: workspaceNames.map<Workspace>((name, index) => ({
          ...mockWorkspaceWithMatch,
          name,
          id: `${mockWorkspaceWithMatch.id}-${index}`,
        })),
      },

      renderListItem: ({ workspace, index }) => (
        <li key={workspace.id}>
          {workspace.name} - index {index}
        </li>
      ),
    });

    for (const [index, name] of workspaceNames.entries()) {
      const listItem = screen.getByText(
        new RegExp(`${name} - index ${index}`, 'i'),
      );

      expect(listItem).toBeInstanceOf(HTMLLIElement);
    }
  });

  it('Displays the call-to-action link for making new workspaces when nothing is loading, but there is no data', async () => {
    await renderWorkspacesList({
      repoUrl: mockCoderWorkspacesConfig.repoUrl,
      workspacesQuery: { data: [] },
    });

    const ctaLink = screen.getByRole('link', { name: /Create workspace/ });
    expect(ctaLink).toBeInTheDocument();
  });

  it('Does NOT display the call-to-action link for making new workspaces when there is no workspace creation URL', async () => {
    await renderWorkspacesList({
      repoUrl: undefined,
      workspacesQuery: { data: [] },
    });

    const ctaLink = screen.queryByRole('link', { name: /Create workspace/ });
    expect(ctaLink).not.toBeInTheDocument();
  });
});
