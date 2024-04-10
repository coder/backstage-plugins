/**
 * @file Defines shared values and types used among any custom Coder auth
 * implementations for the frontend.
 */
import { createApiRef } from '@backstage/core-plugin-api';
import { CODER_API_REF_ID_PREFIX } from '../typesConstants';

export type IsAuthValidCallback = (token: string) => boolean | Promise<boolean>;

type AuthSubscriptionPayload = Readonly<{
  token: string;
  isTokenValid: boolean;
}>;

export type AuthSubscriptionCallback<
  TSubscriptionPayload extends AuthSubscriptionPayload = AuthSubscriptionPayload,
> = (payload: TSubscriptionPayload) => void;

/**
 * Shared set of properties among all Coder auth implementations
 */
export type CoderAuthApi<
  TPayload extends AuthSubscriptionPayload = AuthSubscriptionPayload,
> = TPayload & {
  /**
   * Lets external systems determine if an auth token is valid.
   */
  validateAuth: (validationMethod: IsAuthValidCallback) => Promise<boolean>;

  /**
   * Subscribes an external system to auth changes.
   *
   * Returns an pre-wired unsubscribe callback to remove fuss of needing to hold
   * onto the original callback if it's not directly needed anymore
   */
  subscribe: (callback: AuthSubscriptionCallback<TPayload>) => () => void;

  /**
   * Lets an external system unsubscribe from auth changes.
   */
  unsubscribe: (callback: AuthSubscriptionCallback<TPayload>) => void;

  /**
   * Lets an external system get an fully immutable snapshot of the current auth
   * state.
   */
  getStateSnapshot: () => AuthSubscriptionPayload;
};

/**
 * A single, shared auth API ref that can be used with any of the CoderAuth
 * API classes (CoderTokenAuth, eventually CoderOAuth, etc.)
 */
export const coderAuthApiRef = createApiRef<CoderAuthApi>({
  id: `${CODER_API_REF_ID_PREFIX}.auth`,
});
