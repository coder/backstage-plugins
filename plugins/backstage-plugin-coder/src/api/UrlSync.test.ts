import { type UrlSyncSnapshot, UrlSync } from './UrlSync';
import { type DiscoveryApi } from '@backstage/core-plugin-api';
import {
  getMockConfigApi,
  getMockDiscoveryApi,
  mockBackstageAssetsEndpoint,
  mockBackstageUrlRoot,
  mockBackstageApiEndpointWithoutVersionSuffix,
} from '../testHelpers/mockBackstageData';

// Tests have to assume that DiscoveryApi and ConfigApi will always be in sync,
// and can be trusted as being equivalent-ish ways of getting at the same source
// of truth. If they're ever not, that's a bug with Backstage itself
describe(`${UrlSync.name}`, () => {
  it('Has cached URLs ready to go when instantiated', () => {
    const urlSync = new UrlSync({
      apis: {
        configApi: getMockConfigApi(),
        discoveryApi: getMockDiscoveryApi(),
      },
    });

    const cachedUrls = urlSync.getCachedUrls();
    expect(cachedUrls).toEqual<UrlSyncSnapshot>({
      baseUrl: mockBackstageUrlRoot,
      apiRoute: mockBackstageApiEndpointWithoutVersionSuffix,
      assetsRoute: mockBackstageAssetsEndpoint,
    });
  });

  it('Will update cached URLs if getApiEndpoint starts returning new values (for any reason)', async () => {
    let baseUrl = mockBackstageUrlRoot;
    const mockDiscoveryApi: DiscoveryApi = {
      getBaseUrl: async () => baseUrl,
    };

    const urlSync = new UrlSync({
      apis: {
        configApi: getMockConfigApi(),
        discoveryApi: mockDiscoveryApi,
      },
    });

    const initialSnapshot = urlSync.getCachedUrls();
    baseUrl = 'blah';

    await urlSync.getApiEndpoint();
    const newSnapshot = urlSync.getCachedUrls();
    expect(initialSnapshot).not.toEqual(newSnapshot);

    expect(newSnapshot).toEqual<UrlSyncSnapshot>({
      baseUrl: 'blah',
      apiRoute: 'blah/coder',
      assetsRoute: 'blah/coder',
    });
  });

  it('Lets external systems subscribe and unsubscribe to cached URL changes', async () => {
    let baseUrl = mockBackstageUrlRoot;
    const mockDiscoveryApi: DiscoveryApi = {
      getBaseUrl: async () => baseUrl,
    };

    const urlSync = new UrlSync({
      apis: {
        configApi: getMockConfigApi(),
        discoveryApi: mockDiscoveryApi,
      },
    });

    const onChange = jest.fn();
    urlSync.subscribe(onChange);

    baseUrl = 'blah';
    await urlSync.getApiEndpoint();

    expect(onChange).toHaveBeenCalledWith({
      baseUrl: 'blah',
      apiRoute: 'blah/coder',
      assetsRoute: 'blah/coder',
    } satisfies UrlSyncSnapshot);

    urlSync.unsubscribe(onChange);
    onChange.mockClear();
    baseUrl = mockBackstageUrlRoot;

    await urlSync.getApiEndpoint();
    expect(onChange).not.toHaveBeenCalled();
  });
});
