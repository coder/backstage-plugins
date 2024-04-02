import React, { type ReactNode, Fragment, useState } from 'react';
import { type Theme, makeStyles } from '@material-ui/core';
import { VisuallyHidden } from '../VisuallyHidden';
import { useWorkspacesCardContext } from './Root';
import { Disclosure } from '../Disclosure/Disclosure';
import { InlineCodeSnippet } from '../InlineCodeSnippet/InlineCodeSnippet';

type AccordionItemInfo = Readonly<{
  id: string;
  canDisplay: boolean;
  headerText: ReactNode;
  bodyText: ReactNode;
}>;

type StyleKeys = 'root' | 'link';
type StyleInputs = Readonly<{
  hasData: boolean;
}>;

const useStyles = makeStyles<Theme, StyleInputs, StyleKeys>(theme => ({
  root: ({ hasData }) => ({
    paddingTop: theme.spacing(1),
    borderTop: hasData ? 'none' : `1px solid ${theme.palette.divider}`,
  }),

  link: {
    color: theme.palette.link,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));

export type ReminderAccordionProps = Readonly<{
  canShowEntityReminder?: boolean;
  canShowTemplateNameReminder?: boolean;
}>;

export function ReminderAccordion({
  canShowEntityReminder = true,
  canShowTemplateNameReminder = true,
}: ReminderAccordionProps) {
  const [activeItemId, setActiveItemId] = useState<string>();
  const { isReadingEntityData, workspacesConfig, workspacesQuery } =
    useWorkspacesCardContext();
  const styles = useStyles({ hasData: workspacesQuery.data !== undefined });

  const accordionData: readonly AccordionItemInfo[] = [
    {
      id: 'entity',
      canDisplay:
        canShowEntityReminder &&
        isReadingEntityData &&
        !workspacesConfig.repoUrl,
      headerText: 'Why am I not seeing any workspaces?',
      bodyText: (
        <>
          This component only displays all workspaces when the value of the{' '}
          <InlineCodeSnippet>readEntityData</InlineCodeSnippet> prop is{' '}
          <InlineCodeSnippet>false</InlineCodeSnippet>. See{' '}
          <a
            href="https://github.com/coder/backstage-plugins/blob/main/plugins/backstage-plugin-coder/docs/components.md#notes-4"
            rel="noopener noreferrer"
            target="_blank"
            className={styles.link}
          >
            our documentation
            <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
          </a>{' '}
          for more info.
        </>
      ),
    },
    {
      id: 'templateName',
      canDisplay: canShowTemplateNameReminder && !workspacesConfig.creationUrl,
      headerText: <>Why can&apos;t I make a new workspace?</>,
      bodyText: (
        <>
          This component cannot make a new workspace without a template name
          value. Values can be provided via{' '}
          <InlineCodeSnippet>defaultTemplateName</InlineCodeSnippet> in{' '}
          <InlineCodeSnippet>CoderAppConfig</InlineCodeSnippet> or the{' '}
          <InlineCodeSnippet>templateName</InlineCodeSnippet> property in a
          repo's <InlineCodeSnippet>catalog-info.yaml</InlineCodeSnippet> file.
          See our documentation for more information.
        </>
      ),
    },
  ];

  const toggleAccordionGroup = (newItemId: string) => {
    if (newItemId === activeItemId) {
      setActiveItemId(undefined);
    } else {
      setActiveItemId(newItemId);
    }
  };

  return (
    <div role="group" className={styles.root}>
      {accordionData.map(({ id, canDisplay, headerText, bodyText }) => (
        <Fragment key={id}>
          {canDisplay && (
            <Disclosure
              headerText={headerText}
              isExpanded={id === activeItemId}
              onExpansion={() => toggleAccordionGroup(id)}
            >
              {bodyText}
            </Disclosure>
          )}
        </Fragment>
      ))}
    </div>
  );
}
