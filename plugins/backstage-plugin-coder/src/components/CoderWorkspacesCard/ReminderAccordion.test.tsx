import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInCoderEnvironment } from '../../testHelpers/setup';
import {
  type WorkspacesCardContext,
  CardContext,
  WorkspacesQuery,
} from './Root';
import {
  type ReminderAccordionProps,
  ReminderAccordion,
} from './ReminderAccordion';
import { Workspace } from '../../typesConstants';
import { mockCoderWorkspacesConfig } from '../../testHelpers/mockBackstageData';

type RenderInputs = Readonly<
  ReminderAccordionProps & {
    isReadingEntityData?: boolean;
    repoUrl?: undefined | string;
    queryData?: undefined | readonly Workspace[];
  }
>;

function renderAccordion(inputs?: RenderInputs) {
  const {
    queryData = [],
    isReadingEntityData = true,
    showEntityReminder = true,
    showTemplateNameReminder = true,
    repoUrl = mockCoderWorkspacesConfig.repoUrl,
  } = inputs ?? {};

  const mockContext: WorkspacesCardContext = {
    isReadingEntityData,
    headerId: 'blah',
    onFilterChange: jest.fn(),
    queryFilter: 'blah blah blah',
    workspacesConfig: {
      ...mockCoderWorkspacesConfig,
      repoUrl,
    },
    workspacesQuery: {
      data: queryData,
    } as WorkspacesQuery,
  };

  return renderInCoderEnvironment({
    children: (
      <CardContext.Provider value={mockContext}>
        <ReminderAccordion
          showEntityReminder={showEntityReminder}
          showTemplateNameReminder={showTemplateNameReminder}
        />
      </CardContext.Provider>
    ),
  });
}

describe(`${ReminderAccordion.name}`, () => {
  it('Lets the user open a single accordion item', async () => {
    await renderAccordion();
    const entityToggle = await screen.findByRole('button', {
      name: /Why am I not seeing any workspaces\?/i,
    });

    const user = userEvent.setup();
    await user.click(entityToggle);

    const entityText = await screen.findByText(
      /^This component only displays all workspaces when/,
    );

    expect(entityText).toBeInTheDocument();
  });

  it.only('Will close an open accordion item when that item is clicked', async () => {
    await renderAccordion();
    const entityToggle = await screen.findByRole('button', {
      name: /Why am I not seeing any workspaces\?/i,
    });

    const user = userEvent.setup();
    await user.click(entityToggle);

    const entityText = await screen.findByText(
      /^This component only displays all workspaces when/,
    );

    await user.click(entityToggle);
    expect(entityText).not.toBeInTheDocument();
  });

  it('Will close any other open accordion items when a new item is clicked', async () => {
    expect.hasAssertions();
  });

  it('Lets the user conditionally hide accordion items based on props', async () => {
    expect.hasAssertions();
  });
});
