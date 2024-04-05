/**
 * This is a very, very tiny file for the moment; expect it to get bigger once
 * we add support for Coder OAuth
 */

export interface CoderAuthApi {
  assertAuthIsValid: () => void;
  getRequestInit: () => RequestInit;
}
