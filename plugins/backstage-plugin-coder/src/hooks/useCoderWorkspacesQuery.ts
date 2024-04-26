import { useQuery } from '@tanstack/react-query';

import { workspaces, workspacesByRepo } from '../api';
import { useCoderAuth } from '../components/CoderProvider/CoderAuthProvider';
import { useUrlSync } from './useUrlSync';
import { CoderWorkspacesConfig } from './useCoderWorkspacesConfig';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';

type QueryInput = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

export function useCoderWorkspacesQuery({
  coderQuery,
  workspacesConfig,
}: QueryInput) {
  const auth = useCoderAuth();
  const identityApi = useApi(identityApiRef);
  const { api: urlSyncApi } = useUrlSync();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({
        coderQuery,
        auth,
        identityApi,
        urlSyncApi,
        workspacesConfig,
      })
    : workspaces({ coderQuery, auth, identityApi, urlSyncApi });

  return useQuery(queryOptions);
}
