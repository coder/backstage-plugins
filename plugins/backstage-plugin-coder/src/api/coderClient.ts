/**
 * Knocking a bunch of stuff out at once?
 * 1. Making sure that the plugin can work in isolated dev mode
 * 2. Making it easy to bring in the arbitrary Coder types
 * 3. Providing another way to organize the messy API code we have right now
 * 4. Remove the need for the proxy key in the YAML (maybe)
 *
 * Dumb, unsubstantiated ideas:
 * 1. Move the vast majority of all our API logic into this class, and then sync
 *    the data to React via useSyncExternalStore?
 */
import {
  type DiscoveryApi,
  createApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { parse } from 'valibot';
import { BackstageHttpError } from './BackstageHttpError';
import {
  type Workspace,
  type WorkspaceBuildParameter,
  workspaceBuildParametersSchema,
  workspacesResponseSchema,
} from '../typesConstants';
import {
  type CoderAuth,
  assertValidCoderAuth,
} from '../components/CoderProvider';
import type { CoderEntityConfig } from '../hooks/useCoderEntityConfig';

type CoderClientOptions = Readonly<{
  fetch: typeof fetch;
  requestTimeoutMs: number;
  authTokenHeaderKey: string;
  apiPath: string;
  queryKeyPrefix: string;
}>;

const defaultOptions = {
  fetch: window.fetch,
  requestTimeoutMs: 20_000,
  authTokenHeaderKey: 'Coder-Session-Token',
  apiPath: '/coder/api/v2',
  queryKeyPrefix: 'coder-backstage-plugin',
} as const satisfies CoderClientOptions;

export class CoderClient {
  private readonly discoveryApi: DiscoveryApi;
  private readonly initOptions: CoderClientOptions;

  constructor(
    discoveryApi: DiscoveryApi,
    options?: Partial<CoderClientOptions>,
  ) {
    this.discoveryApi = discoveryApi;
    this.initOptions = { ...defaultOptions, ...(options ?? {}) };
  }

  private async getApiEndpoint(): Promise<string> {
    const proxyUrlBase = await this.discoveryApi.getBaseUrl('proxy');
    return `${proxyUrlBase}${this.initOptions.apiPath}`;
  }

  private getRequestInit(auth: CoderAuth): RequestInit {
    assertValidCoderAuth(auth);
    const { authTokenHeaderKey, requestTimeoutMs } = this.initOptions;

    return {
      headers: { [authTokenHeaderKey]: auth.token },
      signal: AbortSignal.timeout(requestTimeoutMs),
    };
  }

  get options(): CoderClientOptions {
    return this.initOptions;
  }

  // Currently private because it's strictly an implementation detail for
  // CoderClient.getWorkspacesByRepo
  private async getWorkspaceBuildParameters(
    workspaceBuildId: string,
    auth: CoderAuth,
  ): Promise<readonly WorkspaceBuildParameter[]> {
    const apiEndpoint = await this.getApiEndpoint();
    const res = await fetch(
      `${apiEndpoint}/workspacebuilds/${workspaceBuildId}/parameters`,
      this.getRequestInit(auth),
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

  async isAuthValid(auth: CoderAuth): Promise<boolean> {
    const apiEndpoint = await this.getApiEndpoint();

    // In this case, the request doesn't actually matter. Just need to make any
    // kind of dummy request to validate the auth
    const response = await fetch(
      `${apiEndpoint}/users/me`,
      this.getRequestInit(auth),
    );

    if (response.status >= 400 && response.status !== 401) {
      throw new BackstageHttpError('Failed to complete request', response);
    }

    return response.status !== 401;
  }

  async getWorkspaces(
    coderQuery: string,
    auth: CoderAuth,
  ): Promise<readonly Workspace[]> {
    const apiEndpoint = await this.getApiEndpoint();
    const urlParams = new URLSearchParams({ q: coderQuery, limit: '0' });

    const response = await fetch(
      `${apiEndpoint}/workspaces?${urlParams.toString()}`,
      this.getRequestInit(auth),
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
        template_icon: `${apiEndpoint}${templateIcon}`,
      };
    });

    return withRemappedImgUrls;
  }

  async getWorkspacesByRepo(
    coderQuery: string,
    auth: CoderAuth,
    repoConfig: CoderEntityConfig,
  ): Promise<readonly Workspace[]> {
    const allWorkspaces = await this.getWorkspaces(coderQuery, auth);
    const paramResults = await Promise.allSettled(
      allWorkspaces.map(ws => this.getWorkspaceBuildParameters(ws.id, auth)),
    );

    const filtered: Workspace[] = [];
    for (const [index, res] of paramResults.entries()) {
      if (res.status === 'rejected') {
        continue;
      }

      for (const param of res.value) {
        const include =
          repoConfig.repoUrlParamKeys.includes(param.name) &&
          param.value === repoConfig.repoUrl;

        if (include) {
          // Doing type assertion just in case noUncheckedIndexedAccess compiler
          // setting ever gets turned on; this shouldn't ever break, but it's
          // technically not type-safe
          filtered.push(allWorkspaces[index] as Workspace);
          break;
        }
      }
    }

    return filtered;
  }
}

export const coderClientRef = createApiRef<CoderClient>({
  id: 'backstage-plugin-coder.client',
});

export function useCoderClient() {
  return useApi(coderClientRef);
}
