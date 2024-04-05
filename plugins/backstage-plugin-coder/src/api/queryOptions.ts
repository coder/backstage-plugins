import { type UseQueryOptions } from '@tanstack/react-query';
import type { Workspace } from '../typesConstants';
import { CoderClient } from './CoderClient';
import { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';

export const CODER_QUERY_KEY_PREFIX = 'coder-backstage-plugin';
const PENDING_REFETCH_INTERVAL = 5_000;

function getCoderWorkspacesRefetchInterval(
  workspaces?: readonly Workspace[],
): number | false {
  const areAnyWorkspacesPending = workspaces?.some(
    ws => ws.latest_build.status === 'pending',
  );

  return areAnyWorkspacesPending ? PENDING_REFETCH_INTERVAL : false;
}

function getSharedWorkspacesQueryKey(coderQuery: string) {
  return [CODER_QUERY_KEY_PREFIX, 'workspaces', coderQuery] as const;
}

type WorkspacesInputs = Readonly<{
  client: CoderClient;
  coderQuery: string;
}>;

export function workspaces({
  client,
  coderQuery,
}: WorkspacesInputs): UseQueryOptions<readonly Workspace[]> {
  return {
    queryKey: getSharedWorkspacesQueryKey(coderQuery),
    queryFn: () => client.getWorkspaces(coderQuery),
    keepPreviousData: coderQuery !== '',
    refetchInterval: getCoderWorkspacesRefetchInterval,
  };
}

type NeoWorkspacesByRepoInputs = Readonly<{
  client: CoderClient;
  coderQuery: string;
  workspacesConfig: CoderWorkspacesConfig;
}>;

export function workspacesByRepo({
  client,
  coderQuery,
  workspacesConfig,
}: NeoWorkspacesByRepoInputs) {
  const enabled = coderQuery !== '';
  return {
    queryKey: [...getSharedWorkspacesQueryKey(coderQuery), workspacesConfig],
    queryFn: () => client.getWorkspacesByRepo(coderQuery, workspacesConfig),
    enabled,
    keepPreviousData: enabled,
    refetchInterval: getCoderWorkspacesRefetchInterval,
  };
}
