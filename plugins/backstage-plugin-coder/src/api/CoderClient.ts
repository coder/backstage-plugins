import { parse } from 'valibot';
import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { BackstageHttpError } from './errors';
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

export const defaultCoderClientConfigOptions = {
  apiRoutePrefix: '/api/v2',
  assetsRoutePrefix: '/', // Intentionally left as single slash
  requestTimeoutMs: 20_000,
} as const satisfies CoderClientConfigOptions;

export type ArbitraryApiCallFunctionConfig = Readonly<{
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  args: readonly any[];
}>;

export type ApiEndpoints = Readonly<{
  apiRoute: string;
  assetsRoute: string;
}>;

export interface CoderClientApi {
  readonly apiEndpoints: ApiEndpoints;
  makeArbitraryCall: (config: ArbitraryApiCallFunctionConfig) => Promise<any>;
  getWorkspaces: (coderQuery: string) => Promise<readonly Workspace[]>;
  getWorkspacesByRepo: (
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ) => Promise<readonly Workspace[]>;
}

export class CoderClient implements CoderClientApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly authApi: CoderAuthApi;
  private readonly options: CoderClientConfigOptions;
  private lastBaseEndpoint!: string;

  constructor(
    discoveryApi: DiscoveryApi,
    authApi: CoderAuthApi,
    options?: Partial<CoderClientConfigOptions>,
  ) {
    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.options = { ...defaultCoderClientConfigOptions, ...(options ?? {}) };
    void this.getBaseEndpoint();
  }

  private async getBaseEndpoint(): Promise<string> {
    const newestBaseEndpoint = await this.discoveryApi.getBaseUrl('proxy');
    this.lastBaseEndpoint = newestBaseEndpoint;
    return newestBaseEndpoint;
  }

  private async getApiEndpoint(): Promise<string> {
    const baseEndpoint = await this.getBaseEndpoint();
    return `${baseEndpoint}${this.options.apiRoutePrefix}`;
  }

  private async getAssetsEndpoint(): Promise<string> {
    const baseEndpoint = await this.getBaseEndpoint();
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
    return {
      apiRoute: `${this.lastBaseEndpoint}${this.options.apiRoutePrefix}`,
      assetsRoute: `${this.lastBaseEndpoint}${this.options.assetsRoutePrefix}`,
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

  makeArbitraryCall = async (
    config: ArbitraryApiCallFunctionConfig,
  ): Promise<any> => {
    console.log('This is not implemented yet', config);
    return 'blah';
  };
}

export const coderClientRef = createApiRef<CoderClient>({
  id: 'backstage-plugin-coder.coder-client',
});

export function useCoderClient() {
  return useApi(coderClientRef);
}
