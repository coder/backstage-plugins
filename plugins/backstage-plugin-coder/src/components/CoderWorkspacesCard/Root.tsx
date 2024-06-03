/**
 * @file Wires up all the core logic for passing values down to the
 * sub-components in the same directory.
 */
import React, {
  type HTMLAttributes,
  type ReactNode,
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
import type { Workspace } from '../../api/vendoredSdk';
import { useCoderWorkspacesQuery } from '../../hooks/useCoderWorkspacesQuery';
import { CoderAuthFormCardWrapper } from '../CoderAuthFormCardWrapper';

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
    headerContent?: ReactNode;
  }
>;

const InnerRoot = ({
  children,
  className,
  headerContent,
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
      <CoderAuthFormCardWrapper
        role="search"
        headerContent={headerContent}
        aria-labelledby={headerId}
        {...delegatedProps}
      >
        {/* Want to expose the overall container as a form for good
            semantics and screen reader support, but since there isn't an
            explicit submission process (queries happen automatically), it
            felt better to use a <div> with a role override to side-step edge
            cases around keyboard input and button children that native <form>
            elements automatically introduce */}
        <div role="form">{children}</div>
      </CoderAuthFormCardWrapper>
    </CardContext.Provider>
  );
};

export function Root(props: WorkspacesCardProps) {
  /**
   * Binding the value of readEntityData as a render key to make using the
   * component less painful to use overall for end users.
   *
   * Without this, the component will throw an error anytime the user flips the
   * value of readEntityData from false to true, or vice-versa.
   *
   * With a render key, whenever the key changes, the whole component will
   * unmount and then remount. This isn't a problem because all its important
   * state is stored outside React via React Query, so on the remount, it can
   * reuse the existing state and just has rebuild itself via the new props.
   */
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
