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
   * Gives back a "state setter" that lets you dispatch a new auth status to
   * the main Auth class.
   *
   * Dispatching will only go through if the auth class's token does not change
   * between the validator being created, and it being called. If it does
   * change, you will need to make a new validator.
   */
  getAuthValidator: () => AuthValidatorDispatch;

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
