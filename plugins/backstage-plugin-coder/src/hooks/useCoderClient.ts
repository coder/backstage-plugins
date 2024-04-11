import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useApi } from '@backstage/core-plugin-api';
import {
  type CoderSdkApi,
  type CoderClientSnapshot,
  coderClientApiRef,
} from '../api/CoderClient';

export type ReactCoderClient = Readonly<{
  api: CoderSdkApi;
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
