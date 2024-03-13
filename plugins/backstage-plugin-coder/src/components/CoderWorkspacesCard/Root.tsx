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
import { type CoderWorkspaceConfig, useCoderAppConfig } from '../CoderProvider';

type WorkspacesCardContext = Readonly<{
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: UseQueryResult<readonly Workspace[]>;
  headerId: string;
  entityConfig: CoderEntityConfig | undefined;
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
  const appConfig = useCoderAppConfig();
  const [innerFilter, setInnerFilter] = useState(defaultQueryFilter);
  const activeFilter = outerFilter ?? innerFilter;

  const dynamicConfig = useDynamicEntityConfig(readEntityData);
  const workspacesQuery = useCoderWorkspaces(activeFilter, {
    repoConfig: dynamicConfig,
  });

  const headerId = `${hookId}-header`;
  const activeConfig = {
    ...appConfig.workspaces,
    ...(dynamicConfig ?? {}),
  };

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
          workspaceCreationLink: serializeWorkspaceUrl(
            activeConfig,
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

function serializeWorkspaceUrl(
  config: CoderWorkspaceConfig,
  coderAccessUrl: string,
): string {
  const formattedParams = new URLSearchParams({
    mode: (config.mode ?? 'manual') satisfies CoderWorkspaceConfig['mode'],
  });

  const unformatted = config.params;
  if (unformatted !== undefined && unformatted.hasOwnProperty) {
    for (const key in unformatted) {
      if (!unformatted.hasOwnProperty(key)) {
        continue;
      }

      const value = unformatted[key];
      if (value !== undefined) {
        formattedParams.append(`param.${key}`, value);
      }
    }
  }

  const safeTemplate = encodeURIComponent(config.templateName);
  return `${coderAccessUrl}/templates/${safeTemplate}/workspace?${formattedParams.toString()}`;
}
