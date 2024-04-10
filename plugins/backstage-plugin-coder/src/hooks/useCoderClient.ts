import { useApi } from '@backstage/core-plugin-api';
import { coderClientApiRef } from '../api/CoderClient';

export function useCoderClient() {
  return useApi(coderClientApiRef);
}
