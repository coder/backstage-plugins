/**
 * @file This is basically a fancier version of Backstage's built-in
 * DiscoveryApi that is designed to work much better with React. It helps with:
 *
 * 1. Making sure URLs are cached so that they can be accessed directly and
 *    synchronously from the UI
 * 2. Making sure that there are mechanisms for binding value changes to React
 *    state, so that if the URLs change over time, React components can
 *    re-render correctly
 *
 * As of April 2024, there are two main built-in ways of getting URLs from
 * Backstage config values:
 * 1. ConfigApi (offers synchronous methods)
 * 2. DiscoveryApi (offers async methods)
 *
 * Both of these work fine inside event handlers and effects, but are never safe
 * to put directly inside render logic because they're non-deterministic and
 * are not state-based.
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
const CODER_PROXY_PREFIX = '/coder';

const BASE_URL_KEY_FOR_CONFIG_API = 'backend.baseUrl';
const PROXY_URL_KEY_FOR_DISCOVERY_API = 'proxy';

type UrlPrefixes = Readonly<{
  apiRoutePrefix: string;
  assetsRoutePrefix: string;
}>;

export const defaultUrlPrefixes = {
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

const proxyRouteExtractor = /^.+?\/proxy\/\w+$/;

export class UrlSync implements Subscribable<UrlSyncSnapshot> {
  // ConfigApi is literally only used because it offers a synchronous way to
  // get an initial URL to use from inside the constructor
  private readonly configApi: ConfigApi;
  private readonly discoveryApi: DiscoveryApi;
  private readonly urlCache: StateSnapshotManager<UrlSyncSnapshot>;
  // private readonly proxyRoot: string;

  private urlPrefixes: UrlPrefixes;

  constructor(setup: ConstructorInputs) {
    const { apis, urlPrefixes = {} } = setup;
    const { discoveryApi, configApi } = apis;

    this.discoveryApi = discoveryApi;
    this.configApi = configApi;
    this.urlPrefixes = { ...defaultUrlPrefixes, ...urlPrefixes };

    const initialUrl = this.configApi.getString(BASE_URL_KEY_FOR_CONFIG_API);
    // const [, proxyRoot] = proxyRouteExtractor.exec(initialUrl) ?? [];
    // this.proxyRoot = proxyRoot;

    this.urlCache = new StateSnapshotManager<UrlSyncSnapshot>({
      initialSnapshot: this.prepareNewSnapshot(initialUrl),
    });
  }

  private prepareNewSnapshot(newBaseUrl: string): UrlSyncSnapshot {
    const { assetsRoutePrefix, apiRoutePrefix } = this.urlPrefixes;

    return {
      baseUrl: newBaseUrl,
      assetsRoute: `${newBaseUrl}${assetsRoutePrefix}`,
      apiRoute: `${newBaseUrl}${apiRoutePrefix}`,
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
  id: `${CODER_API_REF_ID_PREFIX}.urlSync`,
});
