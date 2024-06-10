/**
 * @file This defines the general helper for accessing the Coder API from
 * Backstage in a type-safe way.
 *
 * This hook is meant to be used both internally AND externally.
 */
import { useApi } from '@backstage/core-plugin-api';
import {
  type BackstageCoderApi,
  coderClientWrapperApiRef,
} from '../api/CoderClient';

export function useCoderApi(): BackstageCoderApi {
  const { api } = useApi(coderClientWrapperApiRef);
  return api;
}
