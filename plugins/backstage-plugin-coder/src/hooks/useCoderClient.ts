import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useApi } from '@backstage/core-plugin-api';
import {
  type BackstageCoderSdkApi,
  type CoderClientSnapshot,
  coderClientApiRef,
} from '../api/CoderClient';

export type ReactCoderClient = Readonly<{
  api: BackstageCoderSdkApi;
  state: CoderClientSnapshot;
}>;

export function useCoderClient(): ReactCoderClient {
  const clientApi = useApi(coderClientApiRef);
  const safeApiStateSnapshot = useSyncExternalStore(
    clientApi.subscribe,
    clientApi.getStateSnapshot,
  );

  return {
    state: safeApiStateSnapshot,
    api: clientApi.sdkApi,
  };
}
