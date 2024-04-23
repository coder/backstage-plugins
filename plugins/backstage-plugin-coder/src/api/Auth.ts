/**
 * @file Defines shared values and types used among any custom Coder auth
 * implementations for the frontend.
 */
import { createApiRef } from '@backstage/core-plugin-api';
import { CODER_API_REF_ID_PREFIX } from '../typesConstants';

type AuthSubscriptionPayload = Readonly<{
  token: string;
  isTokenValid: boolean;
}>;

export type AuthSubscriptionCallback<
  TSubscriptionPayload extends AuthSubscriptionPayload = AuthSubscriptionPayload,
> = (payload: TSubscriptionPayload) => void;

export type AuthValidatorDispatch = (newStatus: boolean) => void;

/**
 * Shared set of properties among all Coder auth implementations
 */
export type CoderAuthApi<
  TPayload extends AuthSubscriptionPayload = AuthSubscriptionPayload,
> = TPayload & {
  /**
   * Gives back a "state setter" that lets a different class dispatch a new auth
   * status to the auth class implementation.
   *
   * Use this to send the new status you think the auth should have. The auth
   * will decide whether it will let the dispatch go through and update state.
   */
  getAuthStateSetter: () => AuthValidatorDispatch;

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
   * Lets an external system get a fully immutable snapshot of the current auth
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
