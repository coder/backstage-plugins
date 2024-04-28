import { useApi } from '@backstage/core-plugin-api';
import { coderClientApiRef, type BackstageCoderSdk } from '../api/CoderClient';

export function useCoderSdk(): BackstageCoderSdk {
  const coderClient = useApi(coderClientApiRef);
  return coderClient.sdk;
}
