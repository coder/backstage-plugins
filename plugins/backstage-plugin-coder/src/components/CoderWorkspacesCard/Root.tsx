import React, {
  type HTMLAttributes,
  createContext,
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
import { useCoderAppConfig } from '../CoderProvider';

type WorkspacesCardContext = Readonly<{
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: UseQueryResult<readonly Workspace[]>;
  headerId: string;
  entityConfig: CoderEntityConfig;
  workspaceCreationLink: string;
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

  const appConfig = useCoderAppConfig();
  const wsConfig = useCoderEntityConfig({ readEntityData });
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
          entityConfig: wsConfig,
          onFilterChange: newFilter => {
            setInnerFilter(newFilter);
            onOuterFilterChange?.(newFilter);
          },
          workspaceCreationLink: serializeWorkspaceUrl(
            wsConfig,
            appConfig.deployment.accessUrl,
          ),
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

function serializeWorkspaceUrl(
  config: CoderEntityConfig,
  coderAccessUrl: string,
): string {
  const formattedParams = new URLSearchParams({ mode: config.mode });

  const unformattedParams = config.params;
  if (unformattedParams !== undefined && unformattedParams.hasOwnProperty) {
    for (const key in unformattedParams) {
      if (!unformattedParams.hasOwnProperty(key)) {
        continue;
      }

      const value = unformattedParams[key];
      if (value !== undefined) {
        formattedParams.append(`param.${key}`, value);
      }
    }
  }

  const safeTemplate = encodeURIComponent(config.templateName);
  return `${coderAccessUrl}/templates/${safeTemplate}/workspace?${formattedParams.toString()}`;
}
