/**
 * @file This is a very, very tiny file for the moment; expect it to get bigger
 * once we add support for Coder OAuth
 */
import { createApiRef } from '@backstage/core-plugin-api';
import { CODER_API_REF_ID_PREFIX } from '../typesConstants';

/**
 * Shared set of properties among all Coder auth implementations
 */
export interface CoderAuthApi {
  assertAuthIsValid: () => void;
  getRequestInit: () => RequestInit;
}

/**
 * A single, shared auth API ref that can be used with any of the CoderAuth
 * API classes (CoderTokenAuth, eventually CoderOAuth, etc.)
 */
export const coderAuthApiRef = createApiRef<CoderAuthApi>({
  id: `${CODER_API_REF_ID_PREFIX}.auth`,
});
