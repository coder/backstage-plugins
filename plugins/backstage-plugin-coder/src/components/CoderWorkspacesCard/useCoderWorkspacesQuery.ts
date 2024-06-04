import { useQuery } from '@tanstack/react-query';
import { workspaces, workspacesByRepo } from '../../api/queryOptions';
import type { CoderWorkspacesConfig } from '../../hooks/useCoderWorkspacesConfig';
import { useCoderSdk } from '../../hooks/useCoderSdk';
import { useInternalCoderAuth } from '../../components/CoderProvider';

type QueryInput = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

export function useCoderWorkspacesQuery({
  coderQuery,
  workspacesConfig,
}: QueryInput) {
  const sdk = useCoderSdk();
  const auth = useInternalCoderAuth();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({ auth, sdk, coderQuery, workspacesConfig })
    : workspaces({ auth, sdk, coderQuery });

  return useQuery(queryOptions);
}
