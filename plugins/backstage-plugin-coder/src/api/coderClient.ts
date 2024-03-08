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
import { BackstageHttpError } from './BackstageHttpError';
import { Workspace, workspacesResponseSchema } from '../typesConstants';
import { parse } from 'valibot';
import { CoderAuth, assertValidCoderAuth } from '../components/CoderProvider';

type CoderClientOptions = Readonly<{
  fetch: typeof fetch;
  requestTimeoutMs: number;
  authTokenHeaderKey: string;
  apiPath: string;
}>;

const defaultOptions = {
  fetch: window.fetch,
  requestTimeoutMs: 20_000,
  authTokenHeaderKey: 'Coder-Session-Token',
  apiPath: '/coder/api/v2',
} as const satisfies CoderClientOptions;

export class CoderClient {
  private readonly discoveryApi: DiscoveryApi;
  private readonly options: CoderClientOptions;

  constructor(
    discoveryApi: DiscoveryApi,
    options?: Partial<CoderClientOptions>,
  ) {
    this.discoveryApi = discoveryApi;
    this.options = { ...defaultOptions, ...(options ?? {}) };
  }

  private async getApiUrl(): Promise<string> {
    const proxyUrlBase = this.discoveryApi.getBaseUrl('proxy');
    return `${proxyUrlBase}${this.options.apiPath}`;
  }

  private getRequestInit(auth: CoderAuth): RequestInit {
    assertValidCoderAuth(auth);
    const { authTokenHeaderKey, requestTimeoutMs } = this.options;

    return {
      headers: { [authTokenHeaderKey]: auth.token },
      signal: AbortSignal.timeout(requestTimeoutMs),
    };
  }

  async getWorkspaces(
    coderQuery: string,
    auth: CoderAuth,
  ): Promise<readonly Workspace[]> {
    const apiEndpoint = await this.getApiUrl();
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
}

export const coderClientRef = createApiRef<CoderClient>({
  id: 'backstage-plugin-coder.client',
});

export function useCoderClient() {
  return useApi(coderClientRef);
}
