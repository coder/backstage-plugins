import { useQuery } from '@tanstack/react-query';
import { workspaces, workspacesByRepo } from '../api/queryOptions';
import type { CoderWorkspacesConfig } from './useCoderWorkspacesConfig';
import { useCoderSdk } from './useCoderSdk';
import { useCoderAuthWithTracking } from '../components/CoderProvider';

type QueryInput = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

export function useCoderWorkspacesQuery({
  coderQuery,
  workspacesConfig,
}: QueryInput) {
  const auth = useCoderAuthWithTracking();
  const coderSdk = useCoderSdk();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({ auth, coderSdk, coderQuery, workspacesConfig })
    : workspaces({ auth, coderSdk, coderQuery });

  return useQuery(queryOptions);
}
