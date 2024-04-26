import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { UrlSync, urlSyncApiRef } from '../api/UrlSync';
import { type UseUrlSyncResult, useUrlSync } from './useUrlSync';
import type { DiscoveryApi } from '@backstage/core-plugin-api';
import {
  mockBackstageAssetsEndpoint,
  mockBackstageProxyEndpoint,
  mockBackstageUrlRoot,
  getMockConfigApi,
} from '../testHelpers/mockBackstageData';

function renderUseUrlSync() {
  let proxyEndpoint = mockBackstageProxyEndpoint;
  const mockDiscoveryApi: DiscoveryApi = {
    getBaseUrl: async () => proxyEndpoint,
  };

  const urlSync = new UrlSync({
    apis: {
      discoveryApi: mockDiscoveryApi,
      configApi: getMockConfigApi(),
    },
  });

  const renderResult = renderHook(useUrlSync, {
    wrapper: ({ children }) => (
      <TestApiProvider apis={[[urlSyncApiRef, urlSync]]}>
        {children}
      </TestApiProvider>
    ),
  });

  return {
    ...renderResult,
    updateMockProxyEndpoint: async (newEndpoint: string) => {
      proxyEndpoint = newEndpoint;
      return act(() => urlSync.getApiEndpoint());
    },
  };
}

describe(`${useUrlSync.name}`, () => {
  const altProxyUrl = 'http://zombo.com/api/proxy/coder';

  describe('State', () => {
    it('Should provide pre-formatted URLs for interacting with Backstage endpoints', () => {
      const { result } = renderUseUrlSync();

      expect(result.current).toEqual(
        expect.objectContaining<Partial<UseUrlSyncResult>>({
          state: {
            baseUrl: mockBackstageUrlRoot,
            assetsRoute: mockBackstageAssetsEndpoint,
            apiRoute: mockBackstageProxyEndpoint,
          },
        }),
      );
    });

    it('Should re-render when URLs change via the UrlSync class', async () => {
      const { result, updateMockProxyEndpoint } = renderUseUrlSync();
      const initialState = result.current.state;

      await updateMockProxyEndpoint(altProxyUrl);
      const newState = result.current.state;
      expect(newState).not.toEqual(initialState);
    });
  });

  describe('Render helpers', () => {
    it('isEmojiUrl should correctly detect whether a URL is valid', async () => {
      const { result, updateMockProxyEndpoint } = renderUseUrlSync();

      // Test for URL that is valid and matches the URL from UrlSync
      const url1 = `${mockBackstageAssetsEndpoint}/emoji`;
      expect(result.current.renderHelpers.isEmojiUrl(url1)).toBe(true);

      // Test for URL that is obviously not valid under any circumstances
      const url2 = "I don't even know how you could get a URL like this";
      expect(result.current.renderHelpers.isEmojiUrl(url2)).toBe(false);

      // Test for URL that was valid when the React app started up, but then
      // UrlSync started giving out a completely different URL
      await updateMockProxyEndpoint(altProxyUrl);
      expect(result.current.renderHelpers.isEmojiUrl(url1)).toBe(false);
    });
  });
});
