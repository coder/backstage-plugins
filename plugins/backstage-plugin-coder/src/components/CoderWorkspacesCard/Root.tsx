import React, {
  type HTMLAttributes,
  createContext,
  forwardRef,
  useContext,
  useState,
} from 'react';

import { useId } from '../../hooks/hookPolyfills';
import { UseQueryResult } from '@tanstack/react-query';
import {
  useCoderEntityConfig,
  type CoderEntityConfig,
} from '../../hooks/useCoderEntityConfig';

import type { Workspace } from '../../typesConstants';
import { useCoderWorkspaces } from '../../hooks/useCoderWorkspaces';
import { Card } from '../Card';
import { CoderAuthWrapper } from '../CoderAuthWrapper';

type WorkspacesCardContext = Readonly<{
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: UseQueryResult<readonly Workspace[]>;
  headerId: string;
  entityConfig: CoderEntityConfig | undefined;
}>;

const CardContext = createContext<WorkspacesCardContext | null>(null);

function useDynamicEntityConfig(
  isEntityLayout: boolean,
): CoderEntityConfig | undefined {
  const [initialEntityLayout] = useState(isEntityLayout);

  // Manually throwing error to cut off any potential hooks bugs early
  if (isEntityLayout !== initialEntityLayout) {
    throw new Error(
      'The value of entityLayout is not allowed to change across re-renders',
    );
  }

  let entityConfig: CoderEntityConfig | undefined = undefined;
  if (isEntityLayout) {
    /* eslint-disable-next-line react-hooks/rules-of-hooks --
       The hook call is conditional, but the condition above ensures it will be
       locked in for the lifecycle of the component. The hook call order will
       never change, which is what the rule is trying to protect you from */
    entityConfig = useCoderEntityConfig();
  }

  return entityConfig;
}

export type WorkspacesCardProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-labelledby'> & {
    queryFilter?: string;
    defaultQueryFilter?: string;
    onFilterChange?: (newFilter: string) => void;
    readEntityData?: boolean;
  }
>;

export const Root = forwardRef<HTMLDivElement, WorkspacesCardProps>(
  (props, ref) => {
    const {
      children,
      className,
      queryFilter: outerFilter,
      onFilterChange: onOuterFilterChange,
      defaultQueryFilter = 'owner:me',
      readEntityData = false,
      ...delegatedProps
    } = props;

    const hookId = useId();
    const [innerFilter, setInnerFilter] = useState(defaultQueryFilter);
    const activeFilter = outerFilter ?? innerFilter;

    const dynamicConfig = useDynamicEntityConfig(readEntityData);
    const workspacesQuery = useCoderWorkspaces(activeFilter, {
      repoConfig: dynamicConfig,
    });

    const headerId = `${hookId}-header`;

    return (
      <CoderAuthWrapper type="card">
        <CardContext.Provider
          value={{
            headerId,
            workspacesQuery,
            queryFilter: activeFilter,
            entityConfig: dynamicConfig,
            onFilterChange: newFilter => {
              setInnerFilter(newFilter);
              onOuterFilterChange?.(newFilter);
            },
          }}
        >
          {/*
           * 2024-01-31: This output is a <div>, but that should be changed to a
           * <search> once it's supported by more browsers. Setting up
           * accessibility markup and landmark behavior manually in the meantime
           */}
          <Card
            ref={ref}
            role="search"
            aria-labelledby={headerId}
            {...delegatedProps}
          >
            <form
              // Using <form> element for semantics, but never want to go
              // through a full native HTML form submission when the user does
              // things like hitting the Enter key
              onSubmit={event => event.preventDefault()}
            >
              {children}
            </form>
          </Card>
        </CardContext.Provider>
      </CoderAuthWrapper>
    );
  },
);

export function useWorkspacesCardContext(): WorkspacesCardContext {
  const contextValue = useContext(CardContext);

  if (contextValue === null) {
    throw new Error(
      `Not calling ${useWorkspacesCardContext.name} from inside a ${Root.name}`,
    );
  }

  return contextValue;
}
