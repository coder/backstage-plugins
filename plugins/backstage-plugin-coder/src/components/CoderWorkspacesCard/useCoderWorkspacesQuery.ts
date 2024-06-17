import { useQuery } from '@tanstack/react-query';
import { workspaces, workspacesByRepo } from '../../api/queryOptions';
import type { CoderWorkspacesConfig } from '../../hooks/useCoderWorkspacesConfig';
import { useCoderApi } from '../../hooks/useCoderApi';
import { useInternalCoderAuth } from '../../components/CoderProvider';

type QueryInput = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

export function useCoderWorkspacesQuery({
  coderQuery,
  workspacesConfig,
}: QueryInput) {
  const api = useCoderApi();
  const auth = useInternalCoderAuth();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({ auth, api, coderQuery, workspacesConfig })
    : workspaces({ auth, api, coderQuery });

  return useQuery(queryOptions);
}
