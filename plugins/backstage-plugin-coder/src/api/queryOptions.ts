/**
 * @file Collection of React Query query option factories for interfacing
 * CoderClient with the rest of the React app.
 */
import type { CoderClient } from './coderClient';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { Workspace } from '../typesConstants';
import type { CoderAuth } from '../components/CoderProvider';
import type { CoderEntityConfig } from '../hooks/useCoderEntityConfig';

type WorkspacesInputs = Readonly<{
  client: CoderClient;
  auth: CoderAuth;
  workspacesQuery: string;
}>;

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

type WorkspacesByRepoInputs = Readonly<{
  client: CoderClient;
  auth: CoderAuth;
  workspacesQuery: string;
  repoConfig: CoderEntityConfig;
}>;

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

export function authQueryKey(client: CoderClient) {
  return [client.options.queryKeyPrefix, 'auth'] as const;
}

type AuthValidityInputs = Readonly<{
  client: CoderClient;
  authToken: string;
}>;

export function authValidation({
  client,
  authToken,
}: AuthValidityInputs): UseQueryOptions<boolean> {
  const enabled = authToken !== '';
  return {
    queryKey: [...authQueryKey(client), authToken],
    queryFn: () => client.isAuthValid(authToken),
    enabled,
    keepPreviousData: enabled,
  };
}
