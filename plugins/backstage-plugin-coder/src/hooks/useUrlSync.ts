import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { type UrlSyncSnapshot, urlSyncApiRef } from '../api/UrlSync';
import { useApi } from '@backstage/core-plugin-api';

export function useUrlSync(): UrlSyncSnapshot {
  const urlSyncApi = useApi(urlSyncApiRef);
  return useSyncExternalStore(urlSyncApi.subscribe, urlSyncApi.getCachedUrls);
}
