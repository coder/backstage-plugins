import React, { type MouseEvent } from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import { mockWorkspace } from '../../testHelpers/mockCoderAppData';
import type { Workspace } from '../../typesConstants';
import { WorkspacesListItem } from './WorkspacesListItem';

type RenderInput = Readonly<{
  isOnline?: boolean;
}>;

async function renderListItem(inputs?: RenderInput) {
  const { isOnline = true } = inputs ?? {};

  const workspace: Workspace = {
    ...mockWorkspace,
    latest_build: {
      ...mockWorkspace.latest_build,
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

  const stateTracker = {
    wasLinkTriggered: false,
  };

  const onClick = (event: MouseEvent) => {
    stateTracker.wasLinkTriggered ||= event.target instanceof HTMLAnchorElement;
  };

  const renderOutput = await renderInCoderEnvironment({
    children: (
      /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions --
         This div is only intercepting clicks produced by the inner list item
         for testing purposes. Plus, the click behavior is merely a convenience
         for mouse users; no need for matching keyboard behavior
      */
      <div onClick={onClick}>
        <WorkspacesListItem workspace={workspace} />
      </div>
    ),
  });

  return { ...renderOutput, stateTracker };
}

describe(`${WorkspacesListItem.name}`, () => {
  it('Lets the user click anywhere in the list item and still trigger the link', async () => {
    const user = userEvent.setup();
    const { stateTracker } = await renderListItem();

    const listItem = screen.getByRole('listitem');
    await user.click(listItem);
    await waitFor(() => expect(stateTracker.wasLinkTriggered).toBe(true));
  });

  it('Indicates when a workspace is online/offline', async () => {
    const { unmount } = await renderListItem({ isOnline: true });
    expect(() => screen.getByText(/Online/i)).not.toThrow();
    unmount();

    await renderListItem({ isOnline: false });
    expect(() => screen.getByText(/Offline/i)).not.toThrow();
  });
});
