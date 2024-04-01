import React, { Fragment, ReactNode, useState } from 'react';
import { useWorkspacesCardContext } from './Root';
import { ReminderAccordionItem } from './ReminderAccordionItem';
import { VisuallyHidden } from '../VisuallyHidden';
import { Theme, makeStyles } from '@material-ui/core';

type AccordionItemInfo = Readonly<{
  id: string;
  canDisplay: boolean;
  headerText: ReactNode;
  bodyText: ReactNode;
}>;

type UseStyleProps = Readonly<{
  hasData: boolean;
}>;

type UseStyleKeys = 'root' | 'snippet' | 'link';

const useStyles = makeStyles<Theme, UseStyleProps, UseStyleKeys>(theme => ({
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

  snippet: {
    color: theme.palette.text.primary,
    borderRadius: theme.spacing(0.5),
    padding: `${theme.spacing(0.2)}px ${theme.spacing(1)}px`,
    backgroundColor: () => {
      const defaultBackgroundColor = theme.palette.background.default;
      const isDefaultSpotifyLightTheme =
        defaultBackgroundColor.toUpperCase() === '#F8F8F8';

      return isDefaultSpotifyLightTheme
        ? 'hsl(0deg,0%,93%)'
        : defaultBackgroundColor;
    },
  },
}));

type Props = Readonly<{
  showEntityReminder?: boolean;
  showTemplateNameReminder?: boolean;
}>;

export function ReminderAccordion({
  showEntityReminder = true,
  showTemplateNameReminder = true,
}: Props) {
  const [activeItemId, setActiveItemId] = useState<string>();
  const { readEntityData, workspacesConfig, workspacesQuery } =
    useWorkspacesCardContext();
  const styles = useStyles({ hasData: workspacesQuery.data !== undefined });

  const toggleAccordionGroup = (newItemId: string) => {
    if (newItemId === activeItemId) {
      setActiveItemId(undefined);
    } else {
      setActiveItemId(newItemId);
    }
  };

  const accordionData: readonly AccordionItemInfo[] = [
    {
      id: 'entity',
      canDisplay:
        showEntityReminder &&
        readEntityData &&
        !workspacesConfig.repoUrl &&
        workspacesQuery.data !== undefined,
      headerText: 'Why am I not seeing any workspaces?',
      bodyText: (
        <>
          This component displays only displays all workspaces when the value of
          the <code className={styles.snippet}>readEntityData</code> prop is{' '}
          <code className={styles.snippet}>false</code>. See{' '}
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
      canDisplay: showTemplateNameReminder && !workspacesConfig.creationUrl,
      headerText: '',
      bodyText: 'Blah',
    },
  ];

  return (
    <>
      {accordionData.map(({ id, canDisplay, headerText, bodyText }) => (
        <Fragment key={id}>
          {canDisplay && (
            <ReminderAccordionItem
              headerText={headerText}
              isExpanded={id === activeItemId}
              onExpansion={() => toggleAccordionGroup(id)}
            >
              {bodyText}
            </ReminderAccordionItem>
          )}
        </Fragment>
      ))}
    </>
  );
}
