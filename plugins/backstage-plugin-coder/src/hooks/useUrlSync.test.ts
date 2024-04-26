import { renderHookAsCoderEntity } from '../testHelpers/setup';
import { useUrlSync } from './useUrlSync';

import {
  mockBackstageAssetsEndpoint,
  mockBackstageProxyEndpoint,
  mockBackstageUrlRoot,
} from '../testHelpers/mockBackstageData';
import { UrlSyncSnapshot } from '../api/UrlSync';

describe(`${useUrlSync.name}`, () => {
  it('Should provide pre-formatted URLs for interacting with Backstage endpoints', async () => {
    const { result } = await renderHookAsCoderEntity(useUrlSync);

    expect(result.current).toEqual(
      expect.objectContaining<UrlSyncSnapshot>({
        baseUrl: mockBackstageUrlRoot,
        assetsRoute: mockBackstageAssetsEndpoint,
        apiRoute: mockBackstageProxyEndpoint,
      }),
    );
  });
});
