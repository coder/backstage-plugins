/**
 * @file Wires up all the core logic for passing values down to the
 * sub-components in the same directory.
 */
import React, {
  type HTMLAttributes,
  createContext,
  useContext,
  useState,
} from 'react';
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

export type WorkspacesQuery = UseQueryResult<readonly Workspace[]>;

export type WorkspacesCardContext = Readonly<{
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: WorkspacesQuery;
  workspacesConfig: CoderWorkspacesConfig;
  headerId: string;
}>;

// Only exported to simplify setting up dependency injection for tests. Should
// not be consumed directly in application code
export const CardContext = createContext<WorkspacesCardContext | null>(null);

export type WorkspacesCardProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-labelledby'> & {
    queryFilter?: string;
    defaultQueryFilter?: string;
    onFilterChange?: (newFilter: string) => void;
    readEntityData?: boolean;
  }
>;

const InnerRoot = ({
  children,
  className,
  queryFilter: outerFilter,
  onFilterChange: onOuterFilterChange,
  defaultQueryFilter = 'owner:me',
  readEntityData = false,
  ...delegatedProps
}: WorkspacesCardProps) => {
  const [innerFilter, setInnerFilter] = useState(defaultQueryFilter);
  const activeFilter = outerFilter ?? innerFilter;

  const workspacesConfig = useCoderWorkspacesConfig({ readEntityData });
  const workspacesQuery = useCoderWorkspacesQuery({
    workspacesConfig,
    coderQuery: activeFilter,
  });

  const hookId = useId();
  const headerId = `${hookId}-header`;

  return (
    <CoderAuthWrapper type="card">
      <CardContext.Provider
        value={{
          headerId,
          workspacesQuery,
          workspacesConfig,
          queryFilter: activeFilter,
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
        </Card>
      </CardContext.Provider>
    </CoderAuthWrapper>
  );
};

export function Root(props: WorkspacesCardProps) {
  // Doing this to insulate the user from needing to worry about accidentally
  // flipping the value of readEntityData between renders. If this value
  // changes, it will cause the component to unmount and remount, but that
  // should be painless/maybe invisible compared to having the component throw
  // a full error and triggering an error boundary
  const renderKey = String(props.readEntityData ?? false);
  return <InnerRoot key={renderKey} {...props} />;
}

export function useWorkspacesCardContext(): WorkspacesCardContext {
  const contextValue = useContext(CardContext);
  if (contextValue === null) {
    throw new Error(
      `Not calling ${useWorkspacesCardContext.name} from inside a ${Root.name}`,
    );
  }

  return contextValue;
}
