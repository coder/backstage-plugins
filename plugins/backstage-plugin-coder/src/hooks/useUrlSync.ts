import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { type UrlSyncSnapshot, urlSyncApiRef } from '../api/UrlSync';
import { useApi } from '@backstage/core-plugin-api';

export type UseUrlSyncResult = Readonly<{
  state: UrlSyncSnapshot;

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
    renderHelpers: {
      isEmojiUrl: url => {
        return url.startsWith(`${state.assetsRoute}/emoji`);
      },
    },
  };
}
