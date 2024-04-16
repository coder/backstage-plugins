import { type UseQueryOptions } from '@tanstack/react-query';
import type { Workspace } from '../typesConstants';
import { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import type { ReactCoderClient } from '../hooks/useCoderClient';

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

type WorkspacesInputs = Readonly<{
  client: ReactCoderClient;
  coderQuery: string;
}>;

export function workspaces({
  client,
  coderQuery,
}: WorkspacesInputs): UseQueryOptions<readonly Workspace[]> {
  return {
    enabled: client.state.isAuthValid,
    queryKey: getSharedWorkspacesQueryKey(coderQuery),
    keepPreviousData: coderQuery !== '',
    refetchInterval: getCoderWorkspacesRefetchInterval,
    queryFn: async () => {
      const response = await client.api.getWorkspaces({
        q: coderQuery,
        limit: 0,
      });

      return response.workspaces;
    },
  };
}

type WorkspacesByRepoInputs = Readonly<{
  client: ReactCoderClient;
  coderQuery: string;
  workspacesConfig: CoderWorkspacesConfig;
}>;

export function workspacesByRepo({
  client,
  coderQuery,
  workspacesConfig,
}: WorkspacesByRepoInputs) {
  const enabled = client.state.isAuthValid && coderQuery !== '';

  return {
    queryKey: [...getSharedWorkspacesQueryKey(coderQuery), workspacesConfig],
    queryFn: async () =>
      client.api.getWorkspacesByRepo(coderQuery, workspacesConfig),
    enabled,
    keepPreviousData: enabled,
    refetchInterval: getCoderWorkspacesRefetchInterval,
  };
}
