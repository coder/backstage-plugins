import axios from 'axios';
import * as coderSdkApi from 'coder/site/src/api/api';

import { getErrorMessage } from 'coder/site/src/api/errors';
import type { Workspace } from 'coder/site/src/api/typesGenerated';

import type { CoderWorkspacesConfig } from '../hooks/useCoderWorkspacesConfig';
import { BackstageHttpError } from './errors';
import { DiscoveryApi, createApiRef } from '@backstage/core-plugin-api';
import { CoderAuthApi } from './Auth';
import { CODER_API_REF_ID_PREFIX } from '../typesConstants';

type CoderClientConfigOptions = Readonly<{
  apiRoutePrefix: string;
  authHeaderKey: string;
  assetsRoutePrefix: string;
  requestTimeoutMs: number;
}>;

export const defaultCoderClientConfigOptions = {
  apiRoutePrefix: '/coder/api/v2',
  assetsRoutePrefix: '/coder',
  authHeaderKey: 'Coder-Session-Token',
  requestTimeoutMs: 20_000,
} as const satisfies CoderClientConfigOptions;

export type ApiEndpoints = Readonly<{
  apiRoute: string;
  assetsRoute: string;
}>;

type ApiNamespace = Readonly<
  typeof coderSdkApi & {
    getWorkspacesByRepo: (
      coderQuery: string,
      config: CoderWorkspacesConfig,
    ) => Promise<readonly Workspace[]>;
  }
>;

export type CoderClientApi = Readonly<{
  api: ApiNamespace;
  isAuthValid: boolean;
  validateAuth: () => Promise<boolean>;
  getApiEndpoints: () => ApiEndpoints;
}>;

export class CoderClient implements CoderClientApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly authApi: CoderAuthApi;
  private readonly options: CoderClientConfigOptions;
  private latestBaseEndpoint: string;

  readonly api: ApiNamespace;

  constructor(
    discoveryApi: DiscoveryApi,
    authApi: CoderAuthApi,
    options?: Partial<CoderClientConfigOptions>,
  ) {
    // Instantiate config properties via constructor's function signature
    this.discoveryApi = discoveryApi;
    this.authApi = authApi;
    this.latestBaseEndpoint = '';
    this.options = { ...defaultCoderClientConfigOptions, ...(options ?? {}) };

    // Wire up API namespace and patch in additional function for end-user
    // convenience. Cannot inline function definitions inside this.api
    // assignment because of funky JavaScript `this` rules
    const getWorkspacesByRepo: typeof this.getWorkspacesByRepo = (
      coderQuery,
      config,
    ) => this.getWorkspacesByRepo(coderQuery, config);

    this.api = { ...coderSdkApi, getWorkspacesByRepo };

    // Wire up Backstage APIs to be aware of Axios, and keep it aware of the
    // most up-to-date state
    axios.interceptors.request.use(async config => {
      config.baseURL = await this.getBaseProxyEndpoint();
      config.headers[this.options.authHeaderKey] = this.authApi.token;
      return config;
    });

    // Call DiscoveryApi to populate initial endpoint path, so that the path
    // can be accessed synchronously from the UI
    void this.getBaseProxyEndpoint();
  }

  get isAuthValid(): boolean {
    return this.authApi.isTokenValid;
  }

  // Backstage officially recommends that you use the DiscoveryApi over the
  // ConfigApi nowadays, and that you call it before each request. But the
  // problem is that the Discovery API has no synchronous methods for getting
  // endpoints, meaning that there's no great built-in way to access that data
  // synchronously. Have to cache it over time
  private async getBaseProxyEndpoint(): Promise<string> {
    const latestBase = await this.discoveryApi.getBaseUrl('proxy');
    this.latestBaseEndpoint = latestBase;
    return latestBase;
  }

  private async getWorkspacesByRepo(
    coderQuery: string,
    config: CoderWorkspacesConfig,
  ): Promise<readonly Workspace[]> {}

  /* ***************************************************************************
   * All public functions should be defined as arrow functions to ensure they
   * can be passed around React without risk of losing their "this" context
   ****************************************************************************/

  validateAuth = (): Promise<boolean> => {
    return this.authApi.validateAuth(async () => {
      // try {
      //    await this.api.getUserLoginType();
      //   return true;
      // } catch (err) {
      // }
      // if (response.status >= 400 && response.status !== 401) {
      //   throw new BackstageHttpError('Failed to complete request', response);
      // }
    });
  };

  getApiEndpoints = (): ApiEndpoints => {
    if (!this.latestBaseEndpoint) {
      return {
        apiRoute: '',
        assetsRoute: '',
      };
    }

    const { apiRoutePrefix, assetsRoutePrefix } = this.options;
    return {
      apiRoute: `${this.latestBaseEndpoint}${apiRoutePrefix}`,
      assetsRoute: `${this.latestBaseEndpoint}${assetsRoutePrefix}`,
    };
  };
}

export const coderClientApiRef = createApiRef<CoderClient>({
  id: `${CODER_API_REF_ID_PREFIX}.coder-client`,
});

export * as ApiTypes from 'coder/site/src/api/typesGenerated';
