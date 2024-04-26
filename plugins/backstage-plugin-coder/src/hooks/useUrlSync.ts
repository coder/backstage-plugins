import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useApi } from '@backstage/core-plugin-api';
import {
  type UrlSyncSnapshot,
  type UrlSync,
  urlSyncApiRef,
} from '../api/UrlSync';

export type UseUrlSyncResult = Readonly<{
  api: UrlSync;
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
  const api = useApi(urlSyncApiRef);
  const state = useSyncExternalStore(api.subscribe, api.getCachedUrls);

  return {
    api,
    state,
    renderHelpers: {
      isEmojiUrl: url => {
        return url.startsWith(`${state.assetsRoute}/emoji`);
      },
    },
  };
}
