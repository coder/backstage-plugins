import { useQuery } from '@tanstack/react-query';
import { workspaces, workspacesByRepo } from '../api/queryOptions';
import type { CoderWorkspacesConfig } from './useCoderWorkspacesConfig';
import { useCoderSdk } from './useCoderSdk';
import { useInternalCoderAuth } from '../components/CoderProvider';

type QueryInput = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

export function useCoderWorkspacesQuery({
  coderQuery,
  workspacesConfig,
}: QueryInput) {
  const auth = useInternalCoderAuth();
  const { sdk } = useCoderSdk();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({ auth, sdk, coderQuery, workspacesConfig })
    : workspaces({ auth, sdk, coderQuery });

  return useQuery(queryOptions);
}
