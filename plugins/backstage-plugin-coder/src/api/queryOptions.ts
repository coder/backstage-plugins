import type { UseQueryOptions } from '@tanstack/react-query';
import type { Workspace } from '../typesConstants';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { type FetchInputs, getWorkspaces, getWorkspacesByRepo } from './api';

export const CODER_QUERY_KEY_PREFIX = 'coder-backstage-plugin';
const PENDING_REFETCH_INTERVAL_MS = 5_000;
const BACKGROUND_REFETCH_INTERVAL_MS = 60_000;

function getCoderWorkspacesRefetchInterval(
  workspaces?: readonly Workspace[],
): number | false {
  if (workspaces === undefined) {
    // Boolean false indicates that no periodic refetching should happen (but
    // a refetch can still happen in the background in response to user action)
    return false;
  }

  const areAnyWorkspacesPending = workspaces.some(ws => {
    if (ws.latest_build.status === 'pending') {
      return true;
    }

    return ws.latest_build.resources.some(resource => {
      const agents = resource.agents;
      return agents?.some(agent => agent.status === 'connecting') ?? false;
    });
  });

  return areAnyWorkspacesPending
    ? PENDING_REFETCH_INTERVAL_MS
    : BACKGROUND_REFETCH_INTERVAL_MS;
}

function getSharedWorkspacesQueryKey(coderQuery: string) {
  return [CODER_QUERY_KEY_PREFIX, 'workspaces', coderQuery] as const;
}

type WorkspacesFetchInputs = Readonly<
  FetchInputs & {
    coderQuery: string;
  }
>;

export function workspaces(
  inputs: WorkspacesFetchInputs,
): UseQueryOptions<readonly Workspace[]> {
  const enabled = inputs.auth.isAuthenticated;

  return {
    queryKey: getSharedWorkspacesQueryKey(inputs.coderQuery),
    queryFn: () => getWorkspaces(inputs),
    enabled,
    keepPreviousData: enabled && inputs.coderQuery !== '',
    refetchInterval: getCoderWorkspacesRefetchInterval,
  };
}

type WorkspacesByRepoFetchInputs = Readonly<
  FetchInputs & {
    coderQuery: string;
    workspacesConfig: CoderWorkspacesConfig;
  }
>;

export function workspacesByRepo(
  inputs: WorkspacesByRepoFetchInputs,
): UseQueryOptions<readonly Workspace[]> {
  // Disabling query object when there is no query text for performance reasons;
  // searching through every workspace with an empty string can be incredibly
  // slow.
  const enabled = inputs.auth.isAuthenticated && inputs.coderQuery !== '';

  return {
    queryKey: [
      ...getSharedWorkspacesQueryKey(inputs.coderQuery),
      inputs.workspacesConfig,
    ],
    queryFn: () => getWorkspacesByRepo(inputs),
    enabled,
    keepPreviousData: enabled,
    refetchInterval: getCoderWorkspacesRefetchInterval,
  };
}
