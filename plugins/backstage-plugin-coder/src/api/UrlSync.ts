/**
 * @file This is basically a fancier version of Backstage's built-in
 * DiscoveryApi that is designed to work much better with React. Its hook
 * counterpart is useUrlSync.
 *
 * The class helps with:
 * 1. Making sure URLs are cached so that they can be accessed directly and
 *    synchronously from the UI
 * 2. Making sure that there are mechanisms for binding value changes to React
 *    state, so that if the URLs change over time, React components can
 *    re-render correctly
 *
 * As of April 2024, there are two main built-in ways of getting URLs from
 * Backstage config values:
 * 1. ConfigApi (offers synchronous methods, but does not have access to the
 *    proxy config)
 * 2. DiscoveryApi (has access to proxy config, but all methods are async)
 *
 * Both of these work fine inside event handlers and effects, but are never safe
 * to put directly inside render logic. They're not pure functions, so they
 * can't be used as derived values, and they don't go through React state, so
 * they're completely disconnected from React's render cycles.
 */
import {
  type DiscoveryApi,
  type ConfigApi,
  createApiRef,
} from '@backstage/core-plugin-api';
import {
  type Subscribable,
  type SubscriptionCallback,
  CODER_API_REF_ID_PREFIX,
} from '../typesConstants';
import { StateSnapshotManager } from '../utils/StateSnapshotManager';

// This is the value we tell people to use inside app-config.yaml
export const CODER_PROXY_PREFIX = '/coder';

const BASE_URL_KEY_FOR_CONFIG_API = 'backend.baseUrl';
const PROXY_URL_KEY_FOR_DISCOVERY_API = 'proxy';

type UrlPrefixes = Readonly<{
  proxyPrefix: string;
  apiRoutePrefix: string;
  assetsRoutePrefix: string;
}>;

export const defaultUrlPrefixes = {
  proxyPrefix: `/api/proxy`,
  apiRoutePrefix: '/api/v2',
  assetsRoutePrefix: '', // Deliberately left as empty string
} as const satisfies UrlPrefixes;

export type UrlSyncSnapshot = Readonly<{
  baseUrl: string;
  apiRoute: string;
  assetsRoute: string;
}>;

type Subscriber = SubscriptionCallback<UrlSyncSnapshot>;

type ConstructorInputs = Readonly<{
  urlPrefixes?: Partial<UrlPrefixes>;
  apis: Readonly<{
    discoveryApi: DiscoveryApi;
    configApi: ConfigApi;
  }>;
}>;

const proxyRouteReplacer = /\/api\/proxy.*?$/;

export class UrlSync implements Subscribable<UrlSyncSnapshot> {
  // ConfigApi is literally only used because it offers a synchronous way to
  // get an initial URL to use from inside the constructor. Should not be used
  // beyond initial constructor call
  private readonly configApi: ConfigApi;
  private readonly discoveryApi: DiscoveryApi;
  private readonly urlCache: StateSnapshotManager<UrlSyncSnapshot>;
  private urlPrefixes: UrlPrefixes;

  constructor(setup: ConstructorInputs) {
    const { apis, urlPrefixes = {} } = setup;
    const { discoveryApi, configApi } = apis;

    this.discoveryApi = discoveryApi;
    this.configApi = configApi;
    this.urlPrefixes = { ...defaultUrlPrefixes, ...urlPrefixes };

    const proxyRoot = this.getProxyRootFromConfigApi();
    this.urlCache = new StateSnapshotManager<UrlSyncSnapshot>({
      initialSnapshot: this.prepareNewSnapshot(proxyRoot),
    });
  }

  private getProxyRootFromConfigApi(): string {
    const baseUrl = this.configApi.getString(BASE_URL_KEY_FOR_CONFIG_API);
    return `${baseUrl}${this.urlPrefixes.proxyPrefix}`;
  }

  private prepareNewSnapshot(newProxyUrl: string): UrlSyncSnapshot {
    const { assetsRoutePrefix, apiRoutePrefix } = this.urlPrefixes;

    return {
      baseUrl: newProxyUrl.replace(proxyRouteReplacer, ''),
      assetsRoute: `${newProxyUrl}${CODER_PROXY_PREFIX}${assetsRoutePrefix}`,
      apiRoute: `${newProxyUrl}${CODER_PROXY_PREFIX}${apiRoutePrefix}`,
    };
  }

  getApiEndpoint = async (): Promise<string> => {
    const proxyRoot = await this.discoveryApi.getBaseUrl(
      PROXY_URL_KEY_FOR_DISCOVERY_API,
    );

    const newSnapshot = this.prepareNewSnapshot(proxyRoot);
    this.urlCache.updateSnapshot(newSnapshot);
    return newSnapshot.apiRoute;
  };

  getCachedUrls = (): UrlSyncSnapshot => {
    return this.urlCache.getSnapshot();
  };

  unsubscribe = (callback: Subscriber): void => {
    this.urlCache.unsubscribe(callback);
  };

  subscribe = (callback: Subscriber): (() => void) => {
    this.urlCache.subscribe(callback);
    return () => this.unsubscribe(callback);
  };
}

export const urlSyncApiRef = createApiRef<UrlSync>({
  id: `${CODER_API_REF_ID_PREFIX}.url-sync`,
});
