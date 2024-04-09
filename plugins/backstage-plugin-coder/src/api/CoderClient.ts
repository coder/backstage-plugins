import { parse } from 'valibot';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { BackstageHttpError } from './errors';
import {
  type ReadonlyJsonValue,
  type Workspace,
  type WorkspaceBuildParameter,
  workspaceBuildParametersSchema,
  workspacesResponseSchema,
} from '../typesConstants';
import { DiscoveryApi, createApiRef, useApi } from '@backstage/core-plugin-api';
import { CoderAuthApi } from './Auth';
import { CODER_API_REF_ID_PREFIX } from '../typesConstants';

type CoderClientConfigOptions = Readonly<{
  apiRoutePrefix: string;
  assetsRoutePrefix: string;
  requestTimeoutMs: number;
}>;

export const defaultCoderClientConfigOptions = {
  apiRoutePrefix: '/coder/api/v2',
  assetsRoutePrefix: '/coder', // Intentionally left as single slash
  requestTimeoutMs: 20_000,
} as const satisfies CoderClientConfigOptions;

export type ArbitraryApiCallFunctionConfig = Readonly<{
  endpoint: string;
  body: ReadonlyJsonValue;

  // Type definition is a TypeScript hack; the overall type definition collapses
  // down to type string, but the other methods specified still show up in
  // auto-complete
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | (string & {});
}>;

export type ApiEndpoints = Readonly<{
  apiRoute: string;
  assetsRoute: string;
}>;

export interface CoderClientApi {
  readonly apiEndpoints: ApiEndpoints;
  getWorkspaces: (coderQuery: string) => Promise<readonly Workspace[]>;

  getWorkspacesByRepo: (
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ) => Promise<readonly Workspace[]>;

  unsafeApiCall: (
    config: ArbitraryApiCallFunctionConfig,
  ) => Promise<ReadonlyJsonValue>;
}

export class CoderClient implements CoderClientApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly authApi: CoderAuthApi;
  private readonly options: CoderClientConfigOptions;

  // Spotify recommends using the DiscoveryApi over the ConfigApi nowadays, but
  // the tradeoff is that the method for getting the proxy endpoints is async.
  // Caching the latest value from each call to ensure that some kind of value
  // is available synchronously for UI updates. Make sure that a dummy proxy
  // call is made as part of the constructor
  private latestProxyEndpoint: string = '';

  constructor(
    discoveryApi: DiscoveryApi,
    authApi: CoderAuthApi,
    options?: Partial<CoderClientConfigOptions>,
  ) {
    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.options = { ...defaultCoderClientConfigOptions, ...(options ?? {}) };

    void this.getBaseProxyEndpoint();
  }

  private async getBaseProxyEndpoint(): Promise<string> {
    const newest = await this.discoveryApi.getBaseUrl('proxy');
    this.latestProxyEndpoint = newest;
    return newest;
  }

  private async getApiEndpoint(): Promise<string> {
    const baseEndpoint = await this.getBaseProxyEndpoint();
    return `${baseEndpoint}${this.options.apiRoutePrefix}`;
  }

  private async getAssetsEndpoint(): Promise<string> {
    const baseEndpoint = await this.getBaseProxyEndpoint();
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

  get apiEndpoints(): ApiEndpoints {
    if (!this.latestProxyEndpoint) {
      return {
        apiRoute: '',
        assetsRoute: '',
      };
    }

    const { apiRoutePrefix, assetsRoutePrefix } = this.options;
    return {
      apiRoute: `${this.latestProxyEndpoint}${apiRoutePrefix}`,
      assetsRoute: `${this.latestProxyEndpoint}${assetsRoutePrefix}`,
    };
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

  unsafeApiCall = async <TReturn = any>(
    config: ArbitraryApiCallFunctionConfig,
  ): Promise<TReturn> => {
    const { endpoint, body, method = 'GET' } = config;

    const baseRequestInit = this.getRequestInit();
    const requestInit: RequestInit = {
      ...baseRequestInit,
      method,
      body: JSON.stringify(body),
    };

    const res = await fetch(endpoint, requestInit);

    if (!res.ok) {
      throw new BackstageHttpError(
        `Unable to complete ${method} request for ${endpoint}`,
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
    return json;
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});

export function useCoderClient() {
  return useApi(coderClientApiRef);
}
