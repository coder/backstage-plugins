/**
 * @file This defines the general helper for accessing the Coder SDK from
 * Backstage in a type-safe way.
 *
 * This hook is meant to be used both internally AND externally.
 */
import { useApi } from '@backstage/core-plugin-api';
import { coderClientApiRef, type BackstageCoderSdk } from '../api/CoderClient';

export function useCoderSdk(): BackstageCoderSdk {
  const { sdk } = useApi(coderClientApiRef);
  return sdk;
}
