import React from 'react';
import { screen } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockWorkspaceWithMatch } from '../../testHelpers/mockCoderAppData';
import type { Workspace } from '../../api/vendoredSdk';
import { WorkspacesListItem } from './WorkspacesListItem';

type RenderInput = Readonly<{
  isOnline?: boolean;
}>;

async function renderListItem(inputs?: RenderInput) {
  const { isOnline = true } = inputs ?? {};

  const workspace: Workspace = {
    ...mockWorkspaceWithMatch,
    latest_build: {
      ...mockWorkspaceWithMatch.latest_build,
      status: isOnline ? 'running' : 'stopped',
      resources: [
        {
          id: '1',
          agents: [
            {
              id: '2',
              status: isOnline ? 'connected' : 'disconnected',
            },
          ],
        },
      ],
    },
  };

  return renderInCoderEnvironment({
    children: <WorkspacesListItem workspace={workspace} />,
  });
}

describe(`${WorkspacesListItem.name}`, () => {
  it('Indicates when a workspace is online/offline', async () => {
    const { unmount } = await renderListItem({ isOnline: true });
    expect(() => screen.getByText(/Online/i)).not.toThrow();
    unmount();

    await renderListItem({ isOnline: false });
    expect(() => screen.getByText(/Offline/i)).not.toThrow();
  });
});
