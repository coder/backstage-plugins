import React, { type HTMLAttributes, type ReactNode, Fragment } from 'react';

import { type Theme, makeStyles } from '@material-ui/core';
import type { CoderSdkTypes } from '../../api/CoderClient';
import { useWorkspacesCardContext } from './Root';
import { WorkspacesListItem } from './WorkspacesListItem';
import { Placeholder } from './Placeholder';

type RenderListItemInput = Readonly<{
  workspace: CoderSdkTypes.Workspace;
  index: number;
  workspaces: readonly CoderSdkTypes.Workspace[];
}>;

export type WorkspacesListProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    emptyState?: ReactNode;
    ordered?: boolean;
    listClassName?: string;
    fullBleedLayout?: boolean;
    renderListItem?: (input: RenderListItemInput) => ReactNode;
  }
>;

type StyleKey = 'root' | 'list' | 'code';

type WorkspacesListMakeStyleInputs = Readonly<{
  fullBleedLayout: boolean;
}>;

const useWorkspacesListStyles = makeStyles<
  Theme,
  WorkspacesListMakeStyleInputs,
  StyleKey
>(theme => ({
  root: ({ fullBleedLayout }) => ({
    maxHeight: '260px',
    overflowX: 'hidden',
    overflowY: 'auto',
    flexShrink: 1,
    borderTop: `1px solid ${theme.palette.divider}`,

    marginLeft: fullBleedLayout ? `-${theme.spacing(2)}px` : 0,
    marginRight: fullBleedLayout ? `-${theme.spacing(2)}px` : 0,

    // Negative bottom margin is to ensure that the overflow bar doesn't look
    // weird when it kicks in; should figure out a way to implement this with
    // padding instead to prevent CSS styling side effects
    marginBottom: `-${theme.spacing(2)}px`,
  }),

  list: {
    margin: 0,
    paddingRight: theme.spacing(2),
    paddingBottom: theme.spacing(2),

    // Not using spacing(2) for optical adjustment reasons; want to make sure
    // all workspace icons are aligned with the search bar icon by default
    paddingLeft: theme.spacing(1.75),
  },

  code: {
    display: 'block',
    paddingTop: theme.spacing(0.75),
    fontSize: '87.5%',
    color: theme.palette.text.primary,
  },
}));

export const WorkspacesList = ({
  renderListItem,
  emptyState,
  className,
  listClassName,
  ordered = true,
  fullBleedLayout = true,
  ...delegatedProps
}: WorkspacesListProps) => {
  const { workspacesQuery, workspacesConfig } = useWorkspacesCardContext();
  const styles = useWorkspacesListStyles({ fullBleedLayout });

  const repoUrl = workspacesConfig.repoUrl ?? '';
  const ListItemContainer = ordered ? 'ol' : 'ul';

  return (
    <div className={`${styles.root} ${className ?? ''}`} {...delegatedProps}>
      {workspacesQuery.isLoading && (
        <Placeholder>
          {workspacesQuery.fetchStatus === 'fetching' ? (
            <>Loading&hellip;</>
          ) : (
            <>Use the search bar to find matching Coder workspaces</>
          )}
        </Placeholder>
      )}

      {workspacesQuery.data?.length === 0 && (
        <>
          {emptyState ?? (
            <Placeholder displayCta={Boolean(repoUrl)}>
              {repoUrl ? (
                <span style={{ display: 'block', textAlign: 'center' }}>
                  No workspaces found for repo
                  <code className={styles.code}>{repoUrl}</code>
                </span>
              ) : (
                <>No workspaces returned for your query</>
              )}
            </Placeholder>
          )}
        </>
      )}

      {workspacesQuery.data && workspacesQuery.data.length > 0 && (
        <ListItemContainer className={`${styles.list} ${listClassName ?? ''}`}>
          {workspacesQuery.data?.map((workspace, index) => (
            <Fragment key={workspace.id}>
              {renderListItem !== undefined ? (
                renderListItem({
                  workspace,
                  index,
                  workspaces: workspacesQuery.data,
                })
              ) : (
                <WorkspacesListItem workspace={workspace} />
              )}
            </Fragment>
          ))}
        </ListItemContainer>
      )}
    </div>
  );
};
