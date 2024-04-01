import React from 'react';
import { makeStyles } from '@material-ui/core';

import { type WorkspacesCardProps, Root } from './Root';
import { HeaderRow } from './HeaderRow';
import { SearchBox } from './SearchBox';
import { WorkspacesList } from './WorkspacesList';
import { CreateWorkspaceLink } from './CreateWorkspaceLink';
import { ExtraActionsButton } from './ExtraActionsButton';
import { ReminderAccordion } from './ReminderAccordion';

const useStyles = makeStyles(theme => ({
  searchWrapper: {
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5),
  },
}));

type Props = Omit<WorkspacesCardProps, 'children' | 'footerContent'>;

export const CoderWorkspacesCard = (props: Props) => {
  const styles = useStyles();

  return (
    <Root {...props}>
      <HeaderRow
        headerLevel="h2"
        actions={
          <>
            <CreateWorkspaceLink />
            <ExtraActionsButton />
          </>
        }
      />

      <div className={styles.searchWrapper}>
        <SearchBox />
      </div>

      <WorkspacesList />
      <ReminderAccordion />
    </Root>
  );
};
