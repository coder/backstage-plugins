import { parse } from 'valibot';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { BackstageHttpError } from './errors';
import {
  type CoderAuth,
  assertValidCoderAuth,
} from '../components/CoderProvider';
import {
  Workspace,
  WorkspaceBuildParameter,
  workspaceBuildParametersSchema,
  workspacesResponseSchema,
} from '../typesConstants';
import { DiscoveryApi, createApiRef, useApi } from '@backstage/core-plugin-api';
import { CoderAuthApi } from './auth';

type CoderClientConfigOptions = Readonly<{
  apiRoutePrefix: string;
  assetsRoutePrefix: string;
  requestTimeoutMs: number;
}>;

const PROXY_ROUTE_PREFIX = '/api/proxy/coder';

export const defaultCoderClientConfigOptions = {
  apiRoutePrefix: '/api/v2',
  assetsRoutePrefix: '', // Intentionally left as empty string
  requestTimeoutMs: 20_000,
} as const satisfies CoderClientConfigOptions;

export interface CoderClientApi {
  getWorkspaces: (coderQuery: string) => Promise<readonly Workspace[]>;
  getWorkspacesByRepo: (
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ) => Promise<readonly Workspace[]>;

  makeArbitraryCall: (...args: readonly any[]) => any;
}

export class CoderClient implements CoderClientApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly authApi: CoderAuthApi;
  private readonly options: CoderClientConfigOptions;

  constructor(
    discoveryApi: DiscoveryApi,
    authApi: CoderAuthApi,
    options?: Partial<CoderClientConfigOptions>,
  ) {
    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.options = { ...defaultCoderClientConfigOptions, ...(options ?? {}) };
  }

  private async getApiEndpoint(): Promise<string> {
    const baseEndpoint = await this.discoveryApi.getBaseUrl('proxy');
    return `${baseEndpoint}${this.options.apiRoutePrefix}`;
  }

  private async getAssetsEndpoint(): Promise<string> {
    const baseEndpoint = await this.discoveryApi.getBaseUrl('proxy');
    return `${baseEndpoint}${this.options.assetsRoutePrefix}`;
  }

  private getRequestInit(): RequestInit {
    this.authApi.assertAuthIsValid();
    const authInit = this.authApi.getRequestInit();

    return {
      ...authInit,
      signal: AbortSignal.timeout(this.options.requestTimeoutMs),
    };
  }

  // This is private because it is an implementation detail of
  // getWorkspacesByRepo. Can likely be removed once that function is updated to
  // account for the new API endpoint
  private async getWorkspaceBuildParameters(
    workspaceBuildId: string,
  ): Promise<readonly WorkspaceBuildParameter[]> {
    const apiEndpoint = await this.getApiEndpoint();
    const res = await fetch(
      `${apiEndpoint}/workspacebuilds/${workspaceBuildId}/parameters`,
      this.getRequestInit(),
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

  /* ***************************************************************************
   * All public functions should be defined as arrow functions to ensure they
   * can be passed around React without risk of losing their "this" context
   ****************************************************************************/

  getWorkspaces = async (coderQuery: string): Promise<readonly Workspace[]> => {
    const apiEndpoint = await this.getApiEndpoint();
    const urlParams = new URLSearchParams({ q: coderQuery, limit: '0' });

    const res = await fetch(
      `${apiEndpoint}/workspaces?${urlParams.toString()}`,
      this.getRequestInit(),
    );

    if (!res.ok) {
      throw new BackstageHttpError(
        `Unable to retrieve workspaces for query (${coderQuery})`,
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
    const { workspaces } = parse(workspacesResponseSchema, json);
    const assetsEndpoint = await this.getAssetsEndpoint();

    const withRemappedImgUrls = workspaces.map(ws => {
      const templateIcon = ws.template_icon;
      if (!templateIcon.startsWith('/')) {
        return ws;
      }

      return { ...ws, template_icon: `${assetsEndpoint}${templateIcon}` };
    });

    return withRemappedImgUrls;
  };

  getWorkspacesByRepo = async (
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ): Promise<readonly Workspace[]> => {
    const workspaces = await this.getWorkspaces(coderQuery);
    const paramResults = await Promise.allSettled(
      workspaces.map(ws =>
        this.getWorkspaceBuildParameters(ws.latest_build.id),
      ),
    );

    const matchedWorkspaces: Workspace[] = [];
    for (const [index, res] of paramResults.entries()) {
      if (res.status === 'rejected') {
        continue;
      }

      for (const param of res.value) {
        const include =
          config.repoUrlParamKeys.includes(param.name) &&
          param.value === config.repoUrl;

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
  };

  makeArbitraryCall = async (...args: readonly any[]): Promise<any> => {
    return 'blah';
  };
}

export const coderClientRef = createApiRef<CoderClient>({
  id: 'backstage-plugin-coder.coder-client',
});

export function useCoderClient() {
  return useApi(coderClientRef);
}

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
