/**
 * @file Collection of React Query query option factories for interfacing
 * CoderClient with the rest of the React app.
 */
import type { CoderClient } from './coderClient';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { Workspace } from '../typesConstants';
import type { CoderAuth } from '../components/CoderProvider';
import type { CoderEntityConfig } from '../hooks/useCoderEntityConfig';

type BaseUseQueryOptionsInputs = Readonly<{
  client: CoderClient;
  auth: CoderAuth;
}>;

type WorkspacesInputs = Readonly<
  BaseUseQueryOptionsInputs & {
    workspacesQuery: string;
  }
>;

export function workspaces({
  auth,
  client,
  workspacesQuery,
}: WorkspacesInputs): UseQueryOptions<readonly Workspace[]> {
  const enabled = auth.status === 'authenticated';
  return {
    queryKey: [
      client.options.queryKeyPrefix,
      auth,
      'workspaces',
      workspacesQuery,
    ],
    queryFn: () => client.getWorkspaces(workspacesQuery, auth),
    enabled,
    keepPreviousData: enabled && workspacesQuery !== '',
  };
}

type WorkspacesByRepoInputs = Readonly<
  BaseUseQueryOptionsInputs & {
    workspacesQuery: string;
    repoConfig: CoderEntityConfig;
  }
>;

export function workspacesByRepo({
  workspacesQuery,
  auth,
  client,
  repoConfig,
}: WorkspacesByRepoInputs): UseQueryOptions<readonly Workspace[]> {
  const enabled = auth.status === 'authenticated' && workspacesQuery !== '';
  return {
    queryKey: [
      client.options.queryKeyPrefix,
      auth,
      'workspaces',
      workspacesQuery,
      repoConfig,
    ],
    queryFn: () =>
      client.getWorkspacesByRepo(workspacesQuery, auth, repoConfig),
    enabled,
    keepPreviousData: enabled,
  };
}

export function authValidation({
  client,
  auth,
}: BaseUseQueryOptionsInputs): UseQueryOptions<boolean> {
  const enabled = auth.token !== '';
  return {
    queryKey: [client.options.queryKeyPrefix, 'auth', auth],
    queryFn: () => client.isAuthValid(auth),
    enabled,
    keepPreviousData: enabled,
  };
}
