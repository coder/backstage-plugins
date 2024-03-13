import { useQuery } from '@tanstack/react-query';

import { workspaces, workspacesByRepo } from '../api';
import { useCoderAuth } from '../components/CoderProvider/CoderAuthProvider';
import { useBackstageEndpoints } from './useBackstageEndpoints';
import { CoderWorkspacesConfig } from './useCoderWorkspacesConfig';

type UseCoderWorkspacesOptions = Readonly<
  Partial<{
    repoConfig: CoderWorkspacesConfig;
  }>
>;

export function useCoderWorkspaces(
  coderQuery: string,
  options?: UseCoderWorkspacesOptions,
) {
  const auth = useCoderAuth();
  const { baseUrl } = useBackstageEndpoints();
  const { repoConfig } = options ?? {};

  const queryOptions = repoConfig
    ? workspacesByRepo({ coderQuery, auth, baseUrl, repoConfig })
    : workspaces({ coderQuery, auth, baseUrl });

  return useQuery(queryOptions);
}
