import { useQuery } from '@tanstack/react-query';

import { workspaces, workspacesByRepo } from '../api';
import { useCoderAuth } from '../components/CoderProvider/CoderAuthProvider';
import { useBackstageEndpoints } from './useBackstageEndpoints';
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
  const identity = useApi(identityApiRef);
  const { baseUrl } = useBackstageEndpoints();
  const hasRepoData = workspacesConfig && workspacesConfig.repoUrl;

  const queryOptions = hasRepoData
    ? workspacesByRepo({
        coderQuery,
        identity,
        auth,
        baseUrl,
        workspacesConfig,
      })
    : workspaces({ coderQuery, identity, auth, baseUrl });

  return useQuery(queryOptions);
}
