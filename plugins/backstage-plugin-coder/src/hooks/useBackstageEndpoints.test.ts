import { renderHookAsCoderEntity } from '../testHelpers/setup';

import {
  UseBackstageEndpointResult,
  useBackstageEndpoints,
} from './useBackstageEndpoints';

import {
  mockBackstageAssetsEndpoint,
  mockBackstageProxyEndpoint,
  mockBackstageUrlRoot,
} from '../testHelpers/mockBackstageData';

describe(`${useBackstageEndpoints.name}`, () => {
  it('Should provide pre-formatted URLs for interacting with Backstage endpoints', async () => {
    const { result } = await renderHookAsCoderEntity(useBackstageEndpoints);

    expect(result.current).toEqual(
      expect.objectContaining<UseBackstageEndpointResult>({
        baseUrl: mockBackstageUrlRoot,
        assetsProxyUrl: mockBackstageAssetsEndpoint,
        apiProxyUrl: mockBackstageProxyEndpoint,
      }),
    );
  });
});
