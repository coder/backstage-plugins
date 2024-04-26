import { parse } from 'valibot';
import { type UseQueryOptions } from '@tanstack/react-query';

import { CoderWorkspacesConfig } from './hooks/useCoderWorkspacesConfig';
import {
  type Workspace,
  workspaceBuildParametersSchema,
  workspacesResponseSchema,
  WorkspaceAgentStatus,
} from './typesConstants';
import { CoderAuth, assertValidCoderAuth } from './components/CoderProvider';
import type { IdentityApi } from '@backstage/core-plugin-api';
import { BackstageHttpError } from './api/errors';
import { UrlSync } from './api/UrlSync';

export const CODER_QUERY_KEY_PREFIX = 'coder-backstage-plugin';

const PROXY_ROUTE_PREFIX = '/api/proxy/coder';
export const API_ROUTE_PREFIX = `${PROXY_ROUTE_PREFIX}/api/v2`;
export const ASSETS_ROUTE_PREFIX = PROXY_ROUTE_PREFIX;

export const CODER_AUTH_HEADER_KEY = 'Coder-Session-Token';
export const REQUEST_TIMEOUT_MS = 20_000;

async function getCoderApiRequestInit(
  authToken: string,
  identity: IdentityApi,
): Promise<RequestInit> {
  const headers: HeadersInit = {
    [CODER_AUTH_HEADER_KEY]: authToken,
  };

  try {
    const credentials = await identity.getCredentials();
    if (credentials.token) {
      headers.Authorization = `Bearer ${credentials.token}`;
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }

    throw new Error(
      "Unable to parse user information for Coder requests. Please ensure that your Backstage deployment is integrated to use Backstage's Identity API",
    );
  }

  return {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

type TempPublicUrlSyncApi = Readonly<{
  getApiEndpoint: UrlSync['getApiEndpoint'];
  getAssetsEndpoint: UrlSync['getAssetsEndpoint'];
}>;

type FetchInputs = Readonly<{
  auth: CoderAuth;
  identityApi: IdentityApi;
  urlSyncApi: TempPublicUrlSyncApi;
}>;

type WorkspacesFetchInputs = Readonly<
  FetchInputs & {
    coderQuery: string;
  }
>;

async function getWorkspaces(
  fetchInputs: WorkspacesFetchInputs,
): Promise<readonly Workspace[]> {
  const { coderQuery, auth, identityApi, urlSyncApi } = fetchInputs;
  assertValidCoderAuth(auth);

  const urlParams = new URLSearchParams({
    q: coderQuery,
    limit: '0',
  });

  const requestInit = await getCoderApiRequestInit(auth.token, identityApi);
  const apiEndpoint = await urlSyncApi.getApiEndpoint();
  const response = await fetch(
    `${apiEndpoint}/workspaces?${urlParams.toString()}`,
    requestInit,
  );

  if (!response.ok) {
    throw new BackstageHttpError(
      `Unable to retrieve workspaces for query (${coderQuery})`,
      response,
    );
  }

  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new BackstageHttpError(
      '200 request has no data - potential proxy issue',
      response,
    );
  }

  const json = await response.json();
  const { workspaces } = parse(workspacesResponseSchema, json);

  const assetsUrl = await urlSyncApi.getAssetsEndpoint();
  const withRemappedImgUrls = workspaces.map(ws => {
    const templateIcon = ws.template_icon;
    if (!templateIcon.startsWith('/')) {
      return ws;
    }

    return {
      ...ws,
      template_icon: `${assetsUrl}${templateIcon}`,
    };
  });

  return withRemappedImgUrls;
}

type BuildParamsFetchInputs = Readonly<
  FetchInputs & {
    workspaceBuildId: string;
  }
>;

async function getWorkspaceBuildParameters(inputs: BuildParamsFetchInputs) {
  const { urlSyncApi, auth, workspaceBuildId, identityApi } = inputs;
  assertValidCoderAuth(auth);

  const requestInit = await getCoderApiRequestInit(auth.token, identityApi);
  const apiEndpoint = await urlSyncApi.getApiEndpoint();
  const res = await fetch(
    `${apiEndpoint}/workspacebuilds/${workspaceBuildId}/parameters`,
    requestInit,
  );

  if (!res.ok) {
    throw new BackstageHttpError(
      `Failed to retreive build params for workspace ID ${workspaceBuildId}`,
      res,
    );
  }

  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new BackstageHttpError(
      '200 request has no data - potential proxy issue',
      res,
    );
  }

  const json = await res.json();
  return parse(workspaceBuildParametersSchema, json);
}

type WorkspacesByRepoFetchInputs = Readonly<
  WorkspacesFetchInputs & {
    workspacesConfig: CoderWorkspacesConfig;
  }
>;

export async function getWorkspacesByRepo(
  inputs: WorkspacesByRepoFetchInputs,
): Promise<readonly Workspace[]> {
  const workspaces = await getWorkspaces(inputs);

  const paramResults = await Promise.allSettled(
    workspaces.map(ws =>
      getWorkspaceBuildParameters({
        ...inputs,
        workspaceBuildId: ws.latest_build.id,
      }),
    ),
  );

  const { workspacesConfig } = inputs;
  const matchedWorkspaces: Workspace[] = [];

  for (const [index, res] of paramResults.entries()) {
    if (res.status === 'rejected') {
      continue;
    }

    for (const param of res.value) {
      const include =
        workspacesConfig.repoUrlParamKeys.includes(param.name) &&
        param.value === workspacesConfig.repoUrl;

      if (include) {
        // Doing type assertion just in case noUncheckedIndexedAccess compiler
        // setting ever gets turned on; this shouldn't ever break, but it's
        // technically not type-safe
        matchedWorkspaces.push(workspaces[index] as Workspace);
        break;
      }
    }
  }

  return matchedWorkspaces;
}

export function getWorkspaceAgentStatuses(
  workspace: Workspace,
): readonly WorkspaceAgentStatus[] {
  const uniqueStatuses: WorkspaceAgentStatus[] = [];

  for (const resource of workspace.latest_build.resources) {
    if (resource.agents === undefined) {
      continue;
    }

    for (const agent of resource.agents) {
      const status = agent.status;
      if (!uniqueStatuses.includes(status)) {
        uniqueStatuses.push(status);
      }
    }
  }

  return uniqueStatuses;
}

export function isWorkspaceOnline(workspace: Workspace): boolean {
  const latestBuildStatus = workspace.latest_build.status;
  const isAvailable =
    latestBuildStatus !== 'stopped' &&
    latestBuildStatus !== 'stopping' &&
    latestBuildStatus !== 'pending';

  if (!isAvailable) {
    return false;
  }

  const statuses = getWorkspaceAgentStatuses(workspace);
  return statuses.every(
    status => status === 'connected' || status === 'connecting',
  );
}

export function workspaces(
  inputs: WorkspacesFetchInputs,
): UseQueryOptions<readonly Workspace[]> {
  const enabled = inputs.auth.isAuthenticated;

  return {
    queryKey: [CODER_QUERY_KEY_PREFIX, 'workspaces', inputs.coderQuery],
    queryFn: () => getWorkspaces(inputs),
    enabled,
    keepPreviousData: enabled && inputs.coderQuery !== '',
  };
}

export function workspacesByRepo(
  inputs: WorkspacesByRepoFetchInputs,
): UseQueryOptions<readonly Workspace[]> {
  // Disabling query object when there is no query text for performance reasons;
  // searching through every workspace with an empty string can be incredibly
  // slow.
  const enabled = inputs.auth.isAuthenticated && inputs.coderQuery !== '';

  return {
    queryKey: [CODER_QUERY_KEY_PREFIX, 'workspaces', inputs.coderQuery, 'repo'],
    queryFn: () => getWorkspacesByRepo(inputs),
    enabled,
    keepPreviousData: enabled,
  };
}

type AuthValidationInputs = Readonly<{
  baseUrl: string;
  authToken: string;
  identity: IdentityApi;
}>;

async function isAuthValid(inputs: AuthValidationInputs): Promise<boolean> {
  const { baseUrl, authToken, identity } = inputs;

  // In this case, the request doesn't actually matter. Just need to make any
  // kind of dummy request to validate the auth
  const requestInit = await getCoderApiRequestInit(authToken, identity);
  const response = await fetch(
    `${baseUrl}${API_ROUTE_PREFIX}/users/me`,
    requestInit,
  );

  if (response.status >= 400 && response.status !== 401) {
    throw new BackstageHttpError('Failed to complete request', response);
  }

  return response.status !== 401;
}

export const authQueryKey = [CODER_QUERY_KEY_PREFIX, 'auth'] as const;

export function authValidation(
  inputs: AuthValidationInputs,
): UseQueryOptions<boolean> {
  const enabled = inputs.authToken !== '';
  return {
    queryKey: [...authQueryKey, inputs.authToken],
    queryFn: () => isAuthValid(inputs),
    enabled,
    keepPreviousData: enabled,
  };
}
