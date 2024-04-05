import { useQuery } from '@tanstack/react-query';
import { workspaces, workspacesByRepo } from './queryOptions';
import { useCoderAuth } from '../components/CoderProvider/CoderAuthProvider';
import { useBackstageEndpoints } from './useBackstageEndpoints';
import type { CoderWorkspacesConfig } from './useCoderWorkspacesConfig';

type QueryInput = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

export function useCoderWorkspacesQuery({
  coderQuery,
  workspacesConfig,
}: QueryInput) {
  const auth = useCoderAuth();
  const { baseUrl } = useBackstageEndpoints();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({ coderQuery, auth, baseUrl, workspacesConfig })
    : workspaces({ coderQuery, auth, baseUrl });

  return useQuery(queryOptions);
}
