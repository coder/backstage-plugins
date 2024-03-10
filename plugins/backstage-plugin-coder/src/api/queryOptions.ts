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
  coderQuery: string;
  auth: CoderAuth;
  client: CoderClient;
}>;

export function workspaces({
  auth,
  client,
  coderQuery,
}: WorkspacesInputs): UseQueryOptions<readonly Workspace[]> {
  const enabled = auth.status === 'authenticated';
  return {
    queryKey: [client.options.queryKeyPrefix, auth, 'workspaces', coderQuery],
    queryFn: () => client.getWorkspaces(coderQuery, auth),
    enabled,
    keepPreviousData: enabled && coderQuery !== '',
  };
}

type WorkspacesByRepoInputs = Readonly<{
  coderQuery: string;
  auth: CoderAuth;
  client: CoderClient;
  repoConfig: CoderEntityConfig;
}>;

export function workspacesByRepo({
  coderQuery,
  auth,
  client,
  repoConfig,
}: WorkspacesByRepoInputs): UseQueryOptions<readonly Workspace[]> {
  const enabled = auth.status === 'authenticated' && coderQuery !== '';
  return {
    queryKey: [
      client.options.queryKeyPrefix,
      auth,
      'workspaces',
      coderQuery,
      repoConfig,
    ],
    queryFn: () => client.getWorkspacesByRepo(coderQuery, auth, repoConfig),
    enabled,
    keepPreviousData: enabled,
  };
}

type AuthValidationInputs = Readonly<{
  coderQuery: string;
  auth: CoderAuth;
  client: CoderClient;
}>;

export function authValidation({
  client,
  auth,
}: AuthValidationInputs): UseQueryOptions<boolean> {
  const enabled = auth.token !== '';
  return {
    queryKey: [client.options.queryKeyPrefix, 'auth', auth],
    queryFn: () => client.isAuthValid(auth),
    enabled,
    keepPreviousData: enabled,
  };
}
