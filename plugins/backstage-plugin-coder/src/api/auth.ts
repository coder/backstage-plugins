/**
 * @file This is a very, very tiny file for the moment; expect it to get bigger
 * once we add support for Coder OAuth
 */

/**
 * Shared set of properties among all Coder auth implementations
 */
export interface CoderAuthApi {
  assertAuthIsValid: () => void;
  getRequestInit: () => RequestInit;
}
