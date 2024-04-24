import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useApi } from '@backstage/core-plugin-api';
import {
  type BackstageCoderSdkApi,
  type CoderClientSnapshot,
  coderClientApiRef,
  CoderClient,
} from '../api/CoderClient';
import { useMemo } from 'react';

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

  const reactClient = useMemo<ReactCoderClient>(() => {
    const { sdkApi, validateAuth } = clientApi;
    return {
      api: sdkApi,
      state: safeApiStateSnapshot,
      internals: { validateAuth },
    };
  }, [clientApi, safeApiStateSnapshot]);

  return reactClient;
}
