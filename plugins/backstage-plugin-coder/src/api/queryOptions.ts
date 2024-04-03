import { type UseQueryOptions } from '@tanstack/react-query';
import type { Workspace } from '../typesConstants';
import {
  type AuthValidationInputs,
  type WorkspacesByRepoFetchInputs,
  isAuthValid,
  getWorkspacesByRepo,
  WorkspacesFetchInputs,
  getWorkspaces,
} from './CoderClient';

export const CODER_QUERY_KEY_PREFIX = 'coder-backstage-plugin';
const PENDING_REFETCH_INTERVAL = 5_000;

export const authQueryKey = [CODER_QUERY_KEY_PREFIX, 'auth'] as const;

export function authValidation(
  inputs: AuthValidationInputs,
): UseQueryOptions<boolean> {
  const enabled = Boolean(inputs.authToken);
  return {
    queryKey: [...authQueryKey, inputs.authToken],
    queryFn: () => isAuthValid(inputs),
    enabled,
    keepPreviousData: enabled,
    refetchOnWindowFocus: query => query.state.data !== false,
  };
}

function getCoderWorkspacesRefetchInterval(
  workspaces?: readonly Workspace[],
): number | false {
  const areAnyWorkspacesPending = workspaces?.some(
    ws => ws.latest_build.status === 'pending',
  );

  return areAnyWorkspacesPending ? PENDING_REFETCH_INTERVAL : false;
}

export function workspaces(
  inputs: WorkspacesFetchInputs,
): UseQueryOptions<readonly Workspace[]> {
  const enabled = inputs.auth.isAuthenticated;
  return {
    queryKey: [CODER_QUERY_KEY_PREFIX, 'workspaces', inputs.coderQuery],
    queryFn: () => getWorkspaces(inputs),
    enabled,
    keepPreviousData: enabled && inputs.coderQuery !== '',
    refetchInterval: getCoderWorkspacesRefetchInterval,
  };
}

export function workspacesByRepo(
  inputs: WorkspacesByRepoFetchInputs,
): UseQueryOptions<readonly Workspace[]> {
  const enabled = inputs.auth.isAuthenticated && inputs.coderQuery !== '';
  return {
    queryKey: [CODER_QUERY_KEY_PREFIX, 'workspaces', inputs.coderQuery, 'repo'],
    queryFn: () => getWorkspacesByRepo(inputs),
    enabled,
    keepPreviousData: enabled,
    refetchInterval: getCoderWorkspacesRefetchInterval,
  };
}
