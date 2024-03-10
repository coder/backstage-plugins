import { useQuery } from '@tanstack/react-query';

import { workspaces, workspacesByRepo } from '../api/queryOptions';
import { useCoderAuth } from '../components/CoderProvider/CoderAuthProvider';
import { CoderEntityConfig } from './useCoderEntityConfig';
import { useCoderClient } from '../api/coderClient';

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
  const client = useCoderClient();
  const { repoConfig } = options ?? {};

  const queryOptions = repoConfig
    ? workspacesByRepo({ coderQuery, auth, client, repoConfig })
    : workspaces({ coderQuery, auth, client });

  return useQuery(queryOptions);
}
