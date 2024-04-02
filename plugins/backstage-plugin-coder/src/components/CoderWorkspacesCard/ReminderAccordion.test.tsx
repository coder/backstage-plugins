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
    canShowEntityReminder = true,
    canShowTemplateNameReminder = true,
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
          canShowEntityReminder={canShowEntityReminder}
          canShowTemplateNameReminder={canShowTemplateNameReminder}
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
      await renderAccordion();
      const entityToggle = await screen.findByRole('button', {
        name: matchers.toggles.entity,
      });

      const user = userEvent.setup();
      await user.click(entityToggle);

      const entityText = await screen.findByText(matchers.bodyText.entity);
      expect(entityText).toBeInTheDocument();
    });

    it('Will close an open accordion item when that item is clicked', async () => {
      await renderAccordion();
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
      await renderAccordion();
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
      type Configuration = Readonly<{
        props: ReminderAccordionProps;
        expectedItemCount: number;
      }>;

      const configurations: readonly Configuration[] = [
        {
          expectedItemCount: 0,
          props: {
            canShowEntityReminder: false,
            canShowTemplateNameReminder: false,
          },
        },
        {
          expectedItemCount: 1,
          props: {
            canShowEntityReminder: false,
            canShowTemplateNameReminder: true,
          },
        },
        {
          expectedItemCount: 1,
          props: {
            canShowEntityReminder: true,
            canShowTemplateNameReminder: false,
          },
        },
      ];

      for (const config of configurations) {
        const { unmount } = await renderAccordion(config.props);
        const accordionItems = screen.queryAllByRole('button');

        expect(accordionItems.length).toBe(config.expectedItemCount);
        unmount();
      }
    });

    it('Will NOT display the template name reminder if there is a creation URL', async () => {
      await renderAccordion({
        creationUrl: mockCoderWorkspacesConfig.creationUrl,
        canShowTemplateNameReminder: true,
      });

      const templateToggle = screen.queryByRole('button', {
        name: matchers.toggles.templateName,
      });

      expect(templateToggle).not.toBeInTheDocument();
    });

    /**
     * Assuming that the user hasn't disabled showing the reminder at all, it
     * will only appear when both of these are true:
     * 1. The component is set up to read entity data
     * 2. There is no repo URL that could be parsed from the entity data
     */
    it('Will only display the entity data reminder when appropriate', async () => {
      type Config = Readonly<{
        isReadingEntityData: boolean;
        repoUrl: string | undefined;
      }>;

      const doNotDisplayConfigs: readonly Config[] = [
        {
          isReadingEntityData: false,
          repoUrl: mockCoderWorkspacesConfig.repoUrl,
        },
        {
          isReadingEntityData: false,
          repoUrl: undefined,
        },
        {
          isReadingEntityData: true,
          repoUrl: mockCoderWorkspacesConfig.repoUrl,
        },
      ];

      for (const config of doNotDisplayConfigs) {
        const { unmount } = await renderAccordion({
          isReadingEntityData: config.isReadingEntityData,
          repoUrl: config.repoUrl,
        });

        const entityToggle = screen.queryByRole('button', {
          name: matchers.toggles.entity,
        });

        expect(entityToggle).not.toBeInTheDocument();
        unmount();
      }

      // Verify that toggle appears only this one time
      await renderAccordion({
        isReadingEntityData: true,
        repoUrl: undefined,
      });

      const entityToggle = await screen.findByRole('button', {
        name: matchers.toggles.entity,
      });

      expect(entityToggle).toBeInTheDocument();
    });
  });
});
