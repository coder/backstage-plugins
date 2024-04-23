import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useApi } from '@backstage/core-plugin-api';
import {
  type BackstageCoderSdkApi,
  type CoderClientSnapshot,
  coderClientApiRef,
  CoderClient,
} from '../api/CoderClient';

type ClientHookInternals = Readonly<{
  validateAuth: CoderClient['validateAuth'];
}>;

export type ReactCoderClient = Readonly<{
  api: BackstageCoderSdkApi;
  state: CoderClientSnapshot;

  /**
   * @private A collection of properties and methods that are used as
   * implementation details for the Coder plugin.
   *
   * These will never be documented - assume that any and all properties in here
   * can be changed/added/removed, even between patch releases.
   */
  internals: ClientHookInternals;
}>;

export function useCoderClient(): ReactCoderClient {
  const clientApi = useApi(coderClientApiRef);
  const safeApiStateSnapshot = useSyncExternalStore(
    clientApi.subscribe,
    clientApi.getStateSnapshot,
  );

  return {
    api: clientApi.sdkApi,
    state: safeApiStateSnapshot,
    internals: { validateAuth: clientApi.validateAuth },
  };
}
