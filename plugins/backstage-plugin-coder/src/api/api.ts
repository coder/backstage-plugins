import { parse } from 'valibot';
import type { IdentityApi } from '@backstage/core-plugin-api';
import { BackstageHttpError } from './errors';
import type { UrlSync } from './UrlSync';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import {
  type CoderAuth,
  assertValidCoderAuth,
} from '../components/CoderProvider';
import {
  type Workspace,
  type WorkspaceAgentStatus,
  workspaceBuildParametersSchema,
  workspacesResponseSchema,
} from '../typesConstants';

export const CODER_AUTH_HEADER_KEY = 'Coder-Session-Token';
export const REQUEST_TIMEOUT_MS = 20_000;

export async function getCoderApiRequestInit(
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

export type FetchInputs = Readonly<{
  auth: CoderAuth;
  identityApi: IdentityApi;
  urlSyncApi: TempPublicUrlSyncApi;
}>;

type WorkspacesFetchInputs = Readonly<
  FetchInputs & {
    coderQuery: string;
  }
>;

export async function getWorkspaces(
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
