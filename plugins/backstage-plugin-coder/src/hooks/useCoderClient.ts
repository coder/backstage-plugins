import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useApi } from '@backstage/core-plugin-api';
import {
  type CoderApiNamespace,
  type CoderClient,
  type CoderClientSnapshot,
  coderClientApiRef,
} from '../api/CoderClient';

type UseCoderClientSnapshot = Readonly<
  CoderClientSnapshot & {
    api: CoderApiNamespace;
    validateAuth: CoderClient['validateAuth'];
  }
>;

export function useCoderClient(): UseCoderClientSnapshot {
  const clientApi = useApi(coderClientApiRef);
  const safeApiSnapshot = useSyncExternalStore(
    clientApi.subscribe,
    clientApi.getStateSnapshot,
  );

  return {
    ...safeApiSnapshot,
    api: clientApi.api,
    validateAuth: clientApi.validateAuth,
  };
}
