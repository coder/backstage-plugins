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
  const identity = useApi(identityApiRef);
  const { baseUrl } = useUrlSync();
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
