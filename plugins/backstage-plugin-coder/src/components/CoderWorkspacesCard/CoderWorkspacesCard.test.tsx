/**
 * @file Defines integration tests for all sub-components in the
 * CoderWorkspacesCard directory.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockAuthStates } from '../../testHelpers/mockBackstageData';
import {
  mockWorkspaceNoParameters,
  mockWorkspaceWithMatch2,
  mockWorkspacesList,
} from '../../testHelpers/mockCoderAppData';
import { type CoderAuthStatus } from '../CoderProvider';
import { CoderWorkspacesCard } from './CoderWorkspacesCard';
import userEvent from '@testing-library/user-event';

type RenderInputs = Readonly<{
  authStatus?: CoderAuthStatus;
  readEntityData?: boolean;
}>;

function renderWorkspacesCard(input?: RenderInputs) {
  const { authStatus = 'authenticated', readEntityData = false } = input ?? {};

  return renderInCoderEnvironment({
    auth: mockAuthStates[authStatus],
    children: <CoderWorkspacesCard readEntityData={readEntityData} />,
  });
}

describe(`${CoderWorkspacesCard.name}`, () => {
  describe('General behavior', () => {
    it('Shows the authentication form when the user is not authenticated', async () => {
      await renderWorkspacesCard({
        authStatus: 'tokenMissing',
      });

      expect(() => {
        screen.getByRole('form', {
          name: /Authenticate with Coder/i,
        });
      }).not.toThrow();
    });

    it('Shows the workspaces list when the user is authenticated (exposed as an accessible search landmark)', async () => {
      await renderWorkspacesCard();

      await waitFor(() => {
        expect(() => {
          screen.getByRole('search', {
            name: /Coder Workspaces/i,
          });
        }).not.toThrow();
      });
    });
  });

  describe('With readEntityData set to false', () => {
    it('Will NOT filter any workspaces by the current repo', async () => {
      await renderWorkspacesCard({ readEntityData: false });
      const workspaceItems = await screen.findAllByRole('listitem');
      expect(workspaceItems.length).toEqual(mockWorkspacesList.length);
    });

    it('Lets the user filter the workspaces by their query text', async () => {
      await renderWorkspacesCard({ readEntityData: false });
      const inputField = await screen.findByRole('searchbox', {
        name: /Search your Coder workspaces/i,
      });

      const user = userEvent.setup();
      await user.tripleClick(inputField);
      await user.keyboard(mockWorkspaceNoParameters.name);

      // If more than one workspace matches, that throws an error
      const onlyWorkspace = await screen.findByRole('listitem');
      expect(onlyWorkspace).toHaveTextContent(mockWorkspaceNoParameters.name);
    });

    it('Shows all workspaces when query text is empty', async () => {
      await renderWorkspacesCard({ readEntityData: false });
      const inputField = await screen.findByRole('searchbox', {
        name: /Search your Coder workspaces/i,
      });

      const user = userEvent.setup();
      await user.tripleClick(inputField);
      await user.keyboard('[Backspace]');

      const allWorkspaces = await screen.findAllByRole('listitem');
      expect(allWorkspaces.length).toEqual(mockWorkspacesList.length);
    });
  });

  describe('With readEntityData set to true', () => {
    it('Will show only the workspaces that match the current repo', async () => {
      await renderWorkspacesCard({ readEntityData: true });
      const workspaceItems = await screen.findAllByRole('listitem');
      expect(workspaceItems.length).toEqual(2);
    });

    it('Lets the user filter the workspaces by their query text (on top of filtering from readEntityData)', async () => {
      await renderWorkspacesCard({ readEntityData: true });

      await waitFor(() => {
        const workspaceItems = screen.getAllByRole('listitem');
        expect(workspaceItems.length).toBe(2);
      });

      const user = userEvent.setup();
      const inputField = await screen.findByRole('searchbox', {
        name: /Search your Coder workspaces/i,
      });

      await user.tripleClick(inputField);
      await user.keyboard(mockWorkspaceWithMatch2.name);

      await waitFor(() => {
        const newWorkspaceItems = screen.getAllByRole('listitem');
        expect(newWorkspaceItems.length).toBe(1);
      });
    });

    /**
     * 2024-03-28 - MES - This is a test case to account for a previous
     * limitation around querying workspaces by repo URL.
     *
     * This limitation no longer exists, so this test should be removed once the
     * rest of the codebase is updated to support the new API endpoint for
     * searching by build parameter
     */
    it('Will not show any workspaces at all when the query text is empty', async () => {
      await renderWorkspacesCard({ readEntityData: true });

      const user = userEvent.setup();
      const inputField = await screen.findByRole('searchbox', {
        name: /Search your Coder workspaces/i,
      });

      await user.tripleClick(inputField);
      await user.keyboard('[Backspace]');

      const emptyState = await screen.findByText(
        /Use the search bar to find matching Coder workspaces/,
      );

      expect(emptyState).toBeInTheDocument();
    });
  });
});
