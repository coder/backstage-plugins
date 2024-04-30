import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useApi } from '@backstage/core-plugin-api';
import {
  type UrlSyncSnapshot,
  type UrlSync,
  urlSyncApiRef,
} from '../api/UrlSync';

export type UseUrlSyncResult = Readonly<{
  state: UrlSyncSnapshot;

  /**
   * @todo This is a temporary property that is being used until the
   * CoderClientApi is created, and can consume the UrlSync class directly.
   *
   * Delete this entire property once the new class is ready.
   */
  api: Readonly<{
    getApiEndpoint: UrlSync['getApiEndpoint'];
    getAssetsEndpoint: UrlSync['getAssetsEndpoint'];
  }>;

  /**
   * A collection of functions that can safely be called from within a React
   * component's render logic to get derived values.
   */
  renderHelpers: {
    isEmojiUrl: (url: string) => boolean;
  };
}>;

export function useUrlSync(): UseUrlSyncResult {
  const urlSyncApi = useApi(urlSyncApiRef);
  const state = useSyncExternalStore(
    urlSyncApi.subscribe,
    urlSyncApi.getCachedUrls,
  );

  return {
    state,
    api: {
      getApiEndpoint: urlSyncApi.getApiEndpoint,
      getAssetsEndpoint: urlSyncApi.getAssetsEndpoint,
    },

    renderHelpers: {
      isEmojiUrl: url => {
        return url.startsWith(`${state.assetsRoute}/emoji`);
      },
    },
  };
}
