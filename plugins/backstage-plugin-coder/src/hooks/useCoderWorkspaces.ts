import { useQuery } from '@tanstack/react-query';

import { workspaces, workspacesByRepo } from '../api';
import { useCoderAuth } from '../components/CoderProvider/CoderAuthProvider';
import { useBackstageEndpoints } from './useBackstageEndpoints';
import { CoderEntityConfig } from './useCoderEntityConfig';

type UseCoderWorkspacesOptions = Readonly<
  Partial<{
    repoConfig: CoderEntityConfig;
  }>
>;

export function useCoderWorkspaces(
  coderQuery: string,
  options?: UseCoderWorkspacesOptions,
) {
  const auth = useCoderAuth();
  const { baseUrl } = useBackstageEndpoints();
  const { repoConfig } = options ?? {};
  const hasRepoData = repoConfig && repoConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({ coderQuery, auth, baseUrl, repoConfig })
    : workspaces({ coderQuery, auth, baseUrl });

  return useQuery(queryOptions);
}
