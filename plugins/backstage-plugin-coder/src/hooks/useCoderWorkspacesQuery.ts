import { useQuery } from '@tanstack/react-query';
import { workspacesByRepo, workspaces } from '../api/queryOptions';
import type { CoderWorkspacesConfig } from './useCoderWorkspacesConfig';
import { useCoderClient } from './useCoderClient';

type QueryInput = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

export function useCoderWorkspacesQuery({
  coderQuery,
  workspacesConfig,
}: QueryInput) {
  const client = useCoderClient();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({ client, coderQuery, workspacesConfig })
    : workspaces({ client, coderQuery });

  return useQuery(queryOptions);
}
