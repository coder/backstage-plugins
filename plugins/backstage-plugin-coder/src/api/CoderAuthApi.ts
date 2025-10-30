import { createApiRef } from '@backstage/core-plugin-api';
import type {
  OAuthApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
} from '@backstage/core-plugin-api';

/**
 * API reference for Coder authentication.
 * 
 * This API integrates Coder's OAuth2 authentication with Backstage's
 * standard auth system, enabling Coder to be used as both a sign-in
 * provider and for third-party resource access.
 * 
 * @public
 */
export const coderAuthApiRef = createApiRef<
  OAuthApi & ProfileInfoApi & BackstageIdentityApi & SessionApi
>({
  id: 'auth.coder',
});

/**
 * Type alias for the Coder auth API.
 * @public
 */
export type CoderAuthApi = OAuthApi &
  ProfileInfoApi &
  BackstageIdentityApi &
  SessionApi;

