import React, {
  type HTMLAttributes,
  createContext,
  useContext,
  useState,
} from 'react';
import { makeStyles } from '@material-ui/core';
import { useId } from '../../hooks/hookPolyfills';
import { UseQueryResult } from '@tanstack/react-query';
import {
  useCoderWorkspacesConfig,
  type CoderWorkspacesConfig,
} from '../../hooks/useCoderWorkspacesConfig';

import type { Workspace } from '../../typesConstants';
import { useCoderWorkspacesQuery } from '../../hooks/useCoderWorkspacesQuery';
import { Card } from '../Card';
import { CoderAuthWrapper } from '../CoderAuthWrapper';
import { VisuallyHidden } from '../VisuallyHidden';

type WorkspacesCardContext = Readonly<{
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: UseQueryResult<readonly Workspace[]>;
  workspacesConfig: CoderWorkspacesConfig;
  headerId: string;
}>;

const CardContext = createContext<WorkspacesCardContext | null>(null);

const useStyles = makeStyles(theme => ({
  button: {
    color: theme.palette.type,
    backgroundColor: theme.palette.background.paper,
    border: 'none',
    paddingTop: theme.spacing(2),
    fontSize: theme.typography.body2.fontSize,
    cursor: 'pointer',
  },

  snippet: {
    backgroundColor: theme.palette.grey[100],
    borderRadius: '0.4em',
  },
}));

export type WorkspacesCardProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-labelledby'> & {
    queryFilter?: string;
    defaultQueryFilter?: string;
    onFilterChange?: (newFilter: string) => void;
    readEntityData?: boolean;
  }
>;

const DataReminder = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = useStyles();

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={styles.button}
      >
        {isExpanded ? '▼' : '►'}{' '}
        {isExpanded ? 'Hide text' : 'Why am I seeing all workspaces?'}
      </button>

      {isExpanded && (
        <p>
          This component displays all workspaces when the entity has no repo URL
          to filter by. Consider disabling{' '}
          <code className={styles.snippet}>readEntityData</code>;{' '}
          <a
            href="https://github.com/coder/backstage-plugins/blob/main/plugins/backstage-plugin-coder/docs/components.md#notes-4"
            rel="noopener noreferrer"
            target="_blank"
            style={{ textDecoration: 'underline', color: 'inherit' }}
          >
            details in our docs
            <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
          </a>
          .
        </p>
      )}
    </div>
  );
};

export const Root = ({
  children,
  className,
  queryFilter: outerFilter,
  onFilterChange: onOuterFilterChange,
  defaultQueryFilter = 'owner:me',
  readEntityData = false,
  ...delegatedProps
}: WorkspacesCardProps) => {
  const hookId = useId();
  const [innerFilter, setInnerFilter] = useState(defaultQueryFilter);
  const activeFilter = outerFilter ?? innerFilter;

  const wsConfig = useCoderWorkspacesConfig({ readEntityData });
  const workspacesQuery = useCoderWorkspacesQuery(activeFilter, {
    workspacesConfig: wsConfig,
  });

  const headerId = `${hookId}-header`;
  const showEntityDataReminder =
    workspacesQuery.data !== undefined && Boolean(wsConfig.repoUrl);

  return (
    <CoderAuthWrapper type="card">
      <CardContext.Provider
        value={{
          headerId,
          workspacesQuery,
          queryFilter: activeFilter,
          workspacesConfig: wsConfig,
          onFilterChange: newFilter => {
            setInnerFilter(newFilter);
            onOuterFilterChange?.(newFilter);
          },
        }}
      >
        {/*
         * 2024-01-31: This output is a <div>, but that should be changed to a
         * <search> once that element is supported by more browsers. Setting up
         * accessibility markup and landmark behavior manually in the meantime
         */}
        <Card role="search" aria-labelledby={headerId} {...delegatedProps}>
          {/* Want to expose the overall container as a form for good
              semantics and screen reader support, but since there isn't an
              explicit submission process (queries happen automatically), it
              felt better to use a <div> with a role override to side-step edge
              cases around keyboard input and button children that native <form>
              elements automatically introduce */}
          <div role="form">{children}</div>
          {showEntityDataReminder && <DataReminder />}
        </Card>
      </CardContext.Provider>
    </CoderAuthWrapper>
  );
};

export function useWorkspacesCardContext(): WorkspacesCardContext {
  const contextValue = useContext(CardContext);
  if (contextValue === null) {
    throw new Error(
      `Not calling ${useWorkspacesCardContext.name} from inside a ${Root.name}`,
    );
  }

  return contextValue;
}
