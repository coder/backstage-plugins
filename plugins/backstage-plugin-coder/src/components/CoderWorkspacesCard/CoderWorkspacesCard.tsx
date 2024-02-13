import React from 'react';
import { makeStyles } from '@material-ui/core';

import { type WorkspacesCardProps, Root } from './Root';
import { HeaderRow } from './HeaderRow';
import { SearchBox } from './SearchBox';
import { WorkspacesList } from './WorkspacesList';
import { RefreshButton } from './RefreshButton';
import { CreateWorkspaceLink } from './CreateWorkspaceLink';

const useStyles = makeStyles(theme => ({
  searchWrapper: {
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5),
  },
}));

export const CoderWorkspacesCard = (
  props: Omit<WorkspacesCardProps, 'children'>,
) => {
  const styles = useStyles();

  return (
    <>
      <Root {...props}>
        <HeaderRow
          headerLevel="h2"
          actions={
            <>
              <RefreshButton />
              <CreateWorkspaceLink />
            </>
          }
        />

        <div className={styles.searchWrapper}>
          <SearchBox />
        </div>

        <WorkspacesList />
      </Root>
    </>
  );
};
