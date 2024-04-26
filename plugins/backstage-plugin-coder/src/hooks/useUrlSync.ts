import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { type UrlSyncSnapshot, urlSyncApiRef } from '../api/UrlSync';
import { useApi } from '@backstage/core-plugin-api';

export type UseUrlSyncResult = Readonly<{
  state: UrlSyncSnapshot;
  uiHelpers: {
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
    uiHelpers: {
      isEmojiUrl: url => {
        return url.startsWith(`${state.assetsRoute}/emoji`);
      },
    },
  };
}
