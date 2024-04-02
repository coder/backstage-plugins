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
    creationUrl?: undefined | string;
    queryData?: undefined | readonly Workspace[];
  }
>;

function renderAccordion(inputs?: RenderInputs) {
  const {
    repoUrl,
    creationUrl,
    queryData = [],
    isReadingEntityData = true,
    showEntityReminder = true,
    showTemplateNameReminder = true,
  } = inputs ?? {};

  const mockContext: WorkspacesCardContext = {
    isReadingEntityData,
    headerId: 'blah',
    onFilterChange: jest.fn(),
    queryFilter: 'blah blah blah',
    workspacesConfig: {
      ...mockCoderWorkspacesConfig,
      repoUrl,
      creationUrl,
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

const matchers = {
  toggles: {
    entity: /Why am I not seeing any workspaces\?/i,
    templateName: /Why can't I make a new workspace\?/,
  },
  bodyText: {
    entity: /^This component only displays all workspaces when/,
    templateName:
      /^This component cannot make a new workspace without a template name value/,
  },
} as const satisfies Record<string, Record<string, RegExp>>;

describe(`${ReminderAccordion.name}`, () => {
  describe('General behavior', () => {
    it('Lets the user open a single accordion item', async () => {
      await renderAccordion({ repoUrl: undefined });
      const entityToggle = await screen.findByRole('button', {
        name: matchers.toggles.entity,
      });

      const user = userEvent.setup();
      await user.click(entityToggle);

      const entityText = await screen.findByText(matchers.bodyText.entity);
      expect(entityText).toBeInTheDocument();
    });

    it('Will close an open accordion item when that item is clicked', async () => {
      await renderAccordion({ repoUrl: undefined });
      const entityToggle = await screen.findByRole('button', {
        name: matchers.toggles.entity,
      });

      const user = userEvent.setup();
      await user.click(entityToggle);

      const entityText = await screen.findByText(matchers.bodyText.entity);
      await user.click(entityToggle);
      expect(entityText).not.toBeInTheDocument();
    });

    it('Only lets one accordion item be open at a time', async () => {
      await renderAccordion({
        repoUrl: undefined,
        creationUrl: undefined,
      });

      const entityToggle = await screen.findByRole('button', {
        name: matchers.toggles.entity,
      });
      const templateNameToggle = await screen.findByRole('button', {
        name: matchers.toggles.templateName,
      });

      const user = userEvent.setup();
      await user.click(entityToggle);

      const entityText = await screen.findByText(matchers.bodyText.entity);
      expect(entityText).toBeInTheDocument();

      await user.click(templateNameToggle);
      expect(entityText).not.toBeInTheDocument();

      const templateText = await screen.findByText(
        matchers.bodyText.templateName,
      );
      expect(templateText).toBeInTheDocument();
    });
  });

  describe('Conditionally displaying items', () => {
    it('Lets the user conditionally hide accordion items based on props', async () => {
      expect.hasAssertions();
    });

    it('Will only display the entity data reminder when appropriate', async () => {
      expect.hasAssertions();
    });

    it('Will only display the template name data reminder when appropriate', async () => {
      expect.hasAssertions();
    });
  });
});
