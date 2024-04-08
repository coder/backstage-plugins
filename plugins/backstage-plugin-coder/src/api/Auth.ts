/**
 * @file This is a very, very tiny file for the moment; expect it to get bigger
 * once we add support for Coder OAuth
 */
import { createApiRef } from '@backstage/core-plugin-api';
import { CoderTokenAuth } from './CoderTokenAuth';

/**
 * Shared set of properties among all Coder auth implementations
 */
export interface CoderAuthApi {
  assertAuthIsValid: () => void;
  getRequestInit: () => RequestInit;
}

// Should be a union of each auth solution that we export. Each member should
// have a "type" property to allow for discriminated union checks
type CoderAuth = CoderTokenAuth;

export const coderAuthApiRef = createApiRef<CoderAuth>({
  id: 'backstage-plugin-coder.auth',
});
