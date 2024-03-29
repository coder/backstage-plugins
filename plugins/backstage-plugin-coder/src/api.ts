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

export const CODER_QUERY_KEY_PREFIX = 'coder-backstage-plugin';

const PROXY_ROUTE_PREFIX = '/api/proxy/coder';
export const API_ROUTE_PREFIX = `${PROXY_ROUTE_PREFIX}/api/v2`;
export const ASSETS_ROUTE_PREFIX = PROXY_ROUTE_PREFIX;

export const CODER_AUTH_HEADER_KEY = 'Coder-Session-Token';
export const REQUEST_TIMEOUT_MS = 20_000;

function getCoderApiRequestInit(authToken: string): RequestInit {
  return {
    headers: { [CODER_AUTH_HEADER_KEY]: authToken },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

// Makes it easier to expose HTTP responses in the event of errors and also
// gives TypeScript a faster way to type-narrow on those errors
export class BackstageHttpError extends Error {
  #response: Response;

  constructor(errorMessage: string, response: Response) {
    super(errorMessage);
    this.name = 'HttpError';
    this.#response = response;
  }

  get status() {
    return this.#response.status;
  }

  get ok() {
    return this.#response.ok;
  }

  get contentType() {
    return this.#response.headers.get('content_type');
  }
}

type FetchInputs = Readonly<{
  auth: CoderAuth;
  baseUrl: string;
}>;

type WorkspacesFetchInputs = Readonly<
  FetchInputs & {
    coderQuery: string;
  }
>;

async function getWorkspaces(
  fetchInputs: WorkspacesFetchInputs,
): Promise<readonly Workspace[]> {
  const { baseUrl, coderQuery, auth } = fetchInputs;
  assertValidCoderAuth(auth);

  const urlParams = new URLSearchParams({
    q: coderQuery,
    limit: '0',
  });

  const response = await fetch(
    `${baseUrl}${API_ROUTE_PREFIX}/workspaces?${urlParams.toString()}`,
    getCoderApiRequestInit(auth.token),
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

  const withRemappedImgUrls = workspaces.map(ws => {
    const templateIcon = ws.template_icon;
    if (!templateIcon.startsWith('/')) {
      return ws;
    }

    return {
      ...ws,
      template_icon: `${baseUrl}${ASSETS_ROUTE_PREFIX}${templateIcon}`,
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
  const { baseUrl, auth, workspaceBuildId } = inputs;
  assertValidCoderAuth(auth);

  const res = await fetch(
    `${baseUrl}${API_ROUTE_PREFIX}/workspacebuilds/${workspaceBuildId}/parameters`,
    getCoderApiRequestInit(auth.token),
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
  const enabled = inputs.auth.status === 'authenticated';

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
  const enabled =
    inputs.auth.status === 'authenticated' && inputs.coderQuery !== '';

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
}>;

async function isAuthValid(inputs: AuthValidationInputs): Promise<boolean> {
  const { baseUrl, authToken } = inputs;

  // In this case, the request doesn't actually matter. Just need to make any
  // kind of dummy request to validate the auth
  const response = await fetch(
    `${baseUrl}${API_ROUTE_PREFIX}/users/me`,
    getCoderApiRequestInit(authToken),
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
