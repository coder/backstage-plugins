/**
 * @file Defines integration tests for all sub-components in the
 * CoderWorkspacesCard directory.
 */
import { screen, waitFor } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockAuthStates } from '../../testHelpers/mockBackstageData';
import {
  mockWorkspaceNoParameters,
  mockWorkspaceWithMatch2,
  mockWorkspacesList,
} from '../../testHelpers/mockCoderPluginData';
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

const matchers = {
  authenticationForm: /Authenticate with Coder/i,
  searchTitle: /Coder Workspaces/i,
  searchbox: /Search your Coder workspaces/i,
  emptyState: /Use the search bar to find matching Coder workspaces/i,
} as const satisfies Record<string, RegExp>;

describe(`${CoderWorkspacesCard.name}`, () => {
  describe('General behavior', () => {
    it('Shows the authentication form when the user is not authenticated', async () => {
      await renderWorkspacesCard({
        authStatus: 'tokenMissing',
      });

      expect(() => {
        screen.getByRole('form', { name: matchers.authenticationForm });
      }).not.toThrow();
    });

    it('Shows the workspaces list when the user is authenticated (exposed as an accessible search landmark)', async () => {
      await renderWorkspacesCard();

      await waitFor(() => {
        expect(() => {
          screen.getByRole('search', { name: matchers.searchTitle });
        }).not.toThrow();
      });
    });

    it('Shows zero workspaces when the query text matches nothing', async () => {
      const entityValues = [true, false] as const;
      const user = userEvent.setup();

      for (const value of entityValues) {
        const { unmount } = await renderWorkspacesCard({
          readEntityData: value,
        });

        const searchbox = await screen.findByRole('searchbox', {
          name: matchers.searchbox,
        });

        await user.tripleClick(searchbox);
        await user.keyboard('[Backspace]');
        await user.keyboard('I-can-do-it-I-can-do-it-nine-times');

        await waitFor(() => {
          // getAllByRole will throw if there isn't at least one node matched
          const listItems = screen.queryAllByRole('listitem');
          expect(listItems.length).toBe(0);
        });

        unmount();
      }
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
      const searchbox = await screen.findByRole('searchbox', {
        name: matchers.searchbox,
      });

      const user = userEvent.setup();
      await user.tripleClick(searchbox);
      await user.keyboard(mockWorkspaceNoParameters.name);

      // If more than one workspace matches, that throws an error
      const onlyWorkspace = await screen.findByRole('listitem');
      expect(onlyWorkspace).toHaveTextContent(mockWorkspaceNoParameters.name);
    });

    it('Shows all workspaces when query text is empty', async () => {
      await renderWorkspacesCard({ readEntityData: false });
      const searchbox = await screen.findByRole('searchbox', {
        name: matchers.searchbox,
      });

      const user = userEvent.setup();
      await user.tripleClick(searchbox);
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
      const searchbox = await screen.findByRole('searchbox', {
        name: matchers.searchbox,
      });

      await user.tripleClick(searchbox);
      await user.keyboard(mockWorkspaceWithMatch2.name);

      await waitFor(() => {
        const newWorkspaceItems = screen.getAllByRole('listitem');
        expect(newWorkspaceItems.length).toBe(1);
      });
    });

    /**
     * For performance reasons, the queries for getting workspaces by repo are
     * disabled when the query string is empty.
     *
     * Even with the API endpoint for searching workspaces by build parameter,
     * you still have to shoot off a bunch of requests just to find everything
     * that could possibly match your Backstage deployment's config options.
     */
    it('Will not show any workspaces at all when the query text is empty', async () => {
      await renderWorkspacesCard({ readEntityData: true });

      const user = userEvent.setup();
      const searchbox = await screen.findByRole('searchbox', {
        name: matchers.searchbox,
      });

      await user.tripleClick(searchbox);
      await user.keyboard('[Backspace]');

      const emptyState = await screen.findByText(matchers.emptyState);
      expect(emptyState).toBeInTheDocument();
    });
  });
});
