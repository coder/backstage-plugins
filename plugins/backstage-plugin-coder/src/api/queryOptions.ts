import type { UseQueryOptions } from '@tanstack/react-query';
import type { Workspace, WorkspacesRequest } from '../typesConstants';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import type { BackstageCoderSdk } from './CoderClient';
import type { CoderAuth } from '../components/CoderProvider';

export const CODER_QUERY_KEY_PREFIX = 'coder-backstage-plugin';

// Defined here and not in CoderAuthProvider.ts to avoid circular dependency
// issues
export const sharedAuthQueryKey = [CODER_QUERY_KEY_PREFIX, 'auth'] as const;

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

type WorkspacesFetchInputs = Readonly<{
  auth: CoderAuth;
  coderSdk: BackstageCoderSdk;
  coderQuery: string;
}>;

export function workspaces({
  auth,
  coderSdk,
  coderQuery,
}: WorkspacesFetchInputs): UseQueryOptions<readonly Workspace[]> {
  const enabled = auth.isAuthenticated;

  return {
    queryKey: getSharedWorkspacesQueryKey(coderQuery),
    enabled,
    keepPreviousData: enabled && coderQuery !== '',
    refetchInterval: getCoderWorkspacesRefetchInterval,
    queryFn: async () => {
      const res = await coderSdk.getWorkspaces({
        q: coderQuery,
        limit: 0,
      });

      return res.workspaces;
    },
  };
}

type WorkspacesByRepoFetchInputs = Readonly<
  WorkspacesFetchInputs & {
    workspacesConfig: CoderWorkspacesConfig;
  }
>;

export function workspacesByRepo({
  coderQuery,
  coderSdk,
  auth,
  workspacesConfig,
}: WorkspacesByRepoFetchInputs): UseQueryOptions<readonly Workspace[]> {
  // Disabling query when there is no query text for performance reasons;
  // searching through every workspace with an empty string can be incredibly
  // slow.
  const enabled = auth.isAuthenticated && coderQuery.trim() !== '';

  return {
    queryKey: [...getSharedWorkspacesQueryKey(coderQuery), workspacesConfig],
    enabled,
    keepPreviousData: enabled,
    refetchInterval: getCoderWorkspacesRefetchInterval,
    queryFn: async () => {
      const request: WorkspacesRequest = { q: coderQuery, limit: 0 };
      const res = await coderSdk.getWorkspacesByRepo(request, workspacesConfig);
      return res.workspaces;
    },
  };
}
