/**
 * @file Defines integration tests for all sub-components in the
 * CoderWorkspacesCard directory.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockAuthStates } from '../../testHelpers/mockBackstageData';
import { mockWorkspacesList } from '../../testHelpers/mockCoderAppData';
import { type CoderAuthStatus } from '../CoderProvider';
import { CoderWorkspacesCard } from './CoderWorkspacesCard';

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
      await renderWorkspacesCard({
        authStatus: 'authenticated',
      });

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
    it.only('Will NOT filter any workspaces by the current repo', async () => {
      await renderWorkspacesCard({
        authStatus: 'authenticated',
        readEntityData: false,
      });

      const workspaceItems = await screen.findAllByRole('listitem');
      expect(workspaceItems.length).toEqual(mockWorkspacesList.length);
    });

    it('Lets the user filter the workspaces by their query text', async () => {});
    it('Shows all workspaces when query text is empty', async () => {});
  });

  describe('With readEntityData set to true', () => {
    it('Will show only the workspaces that match the current repo', async () => {});
    it('Lets the user filter the workspaces by their query text (on top of filtering from readEntityData)', async () => {});

    /**
     * 2024-03-28 - MES - This is a test case to account for a previous
     * limitation around querying workspaces by repo URL.
     *
     * This limitation no longer exists, so this test should be removed once the
     * rest of the codebase is updated to support the new API endpoint for
     * searching by build parameter
     */
    it('Will not show any workspaces at all when the query text is empty', async () => {});
  });
});
