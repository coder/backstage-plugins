import { type UseQueryOptions } from '@tanstack/react-query';
import type { Workspace } from '../typesConstants';
import { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import type { ReactCoderClient } from '../hooks/useCoderClient';

export const CODER_QUERY_KEY_PREFIX = 'coder-backstage-plugin';
const PENDING_REFETCH_INTERVAL_MS = 5_000;

function getCoderWorkspacesRefetchInterval(
  workspaces?: readonly Workspace[],
): number | false {
  const areAnyWorkspacesPending = workspaces?.some(
    ws => ws.latest_build.status === 'pending',
  );

  // Boolean false indicates that no periodic refetching should happen (but
  // a refetch can still happen in the background in response to user action)
  return areAnyWorkspacesPending ? PENDING_REFETCH_INTERVAL_MS : false;
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

type NeoWorkspacesByRepoInputs = Readonly<{
  client: ReactCoderClient;
  coderQuery: string;
  workspacesConfig: CoderWorkspacesConfig;
}>;

export function workspacesByRepo({
  client,
  coderQuery,
  workspacesConfig,
}: NeoWorkspacesByRepoInputs) {
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
