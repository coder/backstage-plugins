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
import { useCoderWorkspaces } from '../../hooks/useCoderWorkspaces';
import { Card } from '../Card';
import { CoderAuthWrapper } from '../CoderAuthWrapper';

type WorkspacesCardContext = Readonly<{
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: UseQueryResult<readonly Workspace[]>;
  workspacesConfig: CoderWorkspacesConfig;
  headerId: string;
}>;

const CardContext = createContext<WorkspacesCardContext | null>(null);

export type WorkspacesCardProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-labelledby'> & {
    queryFilter?: string;
    defaultQueryFilter?: string;
    onFilterChange?: (newFilter: string) => void;
    readEntityData?: boolean;
  }
>;

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
  const workspacesQuery = useCoderWorkspaces(activeFilter, {
    repoConfig: wsConfig,
  });

  const headerId = `${hookId}-header`;

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
