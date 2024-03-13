import React, {
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  Fragment,
} from 'react';

import { type Theme, makeStyles } from '@material-ui/core';
import type { Workspace } from '../../typesConstants';
import { useWorkspacesCardContext } from './Root';
import { WorkspacesListItem } from './WorkspacesListItem';
import { CoderLogo } from '../CoderLogo';

const usePlaceholderStyles = makeStyles(theme => ({
  root: {
    padding: `${theme.spacing(2.5)}px 0px ${theme.spacing(2)}px`,
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'center',
  },

  text: {
    textAlign: 'center',
    padding: `0 ${theme.spacing(2.5)}px`,
    fontWeight: 400,
    fontSize: '1.125rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.1,
  },
}));

type PlaceholderProps = Readonly<PropsWithChildren<unknown>>;

// Placeholder is being treated as an internal implementation detail, and is
// not expected to need much flexibility at the API level
const Placeholder = ({ children }: PlaceholderProps) => {
  const styles = usePlaceholderStyles();

  return (
    <div className={styles.root}>
      <CoderLogo />
      <p className={styles.text}>{children}</p>
    </div>
  );
};

type RenderListItemInput = Readonly<{
  workspace: Workspace;
  index: number;
  workspaces: readonly Workspace[];
}>;

type WorkspacesListProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    emptyState?: ReactNode;
    ordered?: boolean;
    listClassName?: string;
    fullBleedLayout?: boolean;
    renderListItem?: (input: RenderListItemInput) => ReactNode;
  }
>;

type StyleKey = 'root' | 'list';

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
  const { workspacesQuery, entityConfig } = useWorkspacesCardContext();
  const styles = useWorkspacesListStyles({ fullBleedLayout });

  const repoUrl = entityConfig?.repoUrl ?? '';
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
          {emptyState !== undefined ? (
            emptyState
          ) : (
            <Placeholder>
              {repoUrl ? (
                <div style={{ textAlign: 'center' }}>
                  No workspaces for repo
                  <br />
                  {repoUrl}
                </div>
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

          {console.error(
            "Be sure to clean up all these extra .map calls when you're done!",
          )}

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
