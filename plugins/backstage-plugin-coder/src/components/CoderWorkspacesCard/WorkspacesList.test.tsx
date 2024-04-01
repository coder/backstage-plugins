import React from 'react';
import { type WorkspacesListProps, WorkspacesList } from './WorkspacesList';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { CardContext, WorkspacesCardContext, WorkspacesQuery } from './Root';
import { mockCoderWorkspacesConfig } from '../../testHelpers/mockBackstageData';
import { mockWorkspaceWithMatch } from '../../testHelpers/mockCoderAppData';
import { Workspace } from '../../typesConstants';
import { screen } from '@testing-library/react';

type RenderInputs = Readonly<{
  workspacesQuery: Partial<WorkspacesQuery>;
  renderListItem?: WorkspacesListProps['renderListItem'];
}>;

function renderWorkspacesList(inputs?: RenderInputs) {
  const { renderListItem, workspacesQuery } = inputs ?? {};

  const mockContext: WorkspacesCardContext = {
    isReadingEntityData: true,
    headerId: "Doesn't matter",
    queryFilter: "Also doesn't matter",
    onFilterChange: jest.fn(),
    workspacesConfig: mockCoderWorkspacesConfig,
    workspacesQuery: workspacesQuery as WorkspacesQuery,
  };

  return renderInCoderEnvironment({
    children: (
      <CardContext.Provider value={mockContext}>
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

  it('Does not display the call-to-action button for making new workspaces when there is no workspace creation URL', async () => {
    expect.hasAssertions();
  });
});
