import { useQuery } from '@tanstack/react-query';

import { workspaces, workspacesByRepo } from '../api';
import { useCoderAuth } from '../components/CoderProvider/CoderAuthProvider';
import { useBackstageEndpoints } from './useBackstageEndpoints';
import { CoderWorkspacesConfig } from './useCoderWorkspacesConfig';

type UseCoderWorkspacesQueryOptions = Readonly<
  Partial<{
    workspacesConfig: CoderWorkspacesConfig;
  }>
>;

export function useCoderWorkspacesQuery(
  coderQuery: string,
  options?: UseCoderWorkspacesQueryOptions,
) {
  const auth = useCoderAuth();
  const { baseUrl } = useBackstageEndpoints();
  const { workspacesConfig } = options ?? {};

  const queryOptions = workspacesConfig
    ? workspacesByRepo({ coderQuery, auth, baseUrl, workspacesConfig })
    : workspaces({ coderQuery, auth, baseUrl });

  return useQuery(queryOptions);
}
