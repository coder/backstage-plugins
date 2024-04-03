import { parse } from 'valibot';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { BackstageHttpError } from './errors';
import {
  type CoderAuth,
  assertValidCoderAuth,
} from '../components/CoderProvider';
import {
  Workspace,
  workspaceBuildParametersSchema,
  workspacesResponseSchema,
} from '../typesConstants';

const PROXY_ROUTE_PREFIX = '/api/proxy/coder';
export const API_ROUTE_PREFIX = `${PROXY_ROUTE_PREFIX}/api/v2`;
export const ASSETS_ROUTE_PREFIX = PROXY_ROUTE_PREFIX;

export const CODER_AUTH_HEADER_KEY = 'Coder-Session-Token';
export const REQUEST_TIMEOUT_MS = 20_000;

export function getCoderApiRequestInit(authToken: string): RequestInit {
  return {
    headers: { [CODER_AUTH_HEADER_KEY]: authToken },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

export type AuthValidationInputs = Readonly<{
  baseUrl: string;
  authToken: string;
}>;

export async function isAuthValid(
  inputs: AuthValidationInputs,
): Promise<boolean> {
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

type FetchInputs = Readonly<{
  auth: CoderAuth;
  baseUrl: string;
}>;

export type WorkspacesFetchInputs = Readonly<
  FetchInputs & {
    coderQuery: string;
  }
>;

export async function getWorkspaces(
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

export type WorkspacesByRepoFetchInputs = Readonly<
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
