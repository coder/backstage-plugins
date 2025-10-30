import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import {
  createOAuthAuthenticator,
  PassportOAuthAuthenticatorHelper,
  PassportOAuthDoneCallback,
  PassportProfile,
} from '@backstage/plugin-auth-node';

/** @public */
export const coderAuthenticator = createOAuthAuthenticator({
  defaultProfileTransform:
    PassportOAuthAuthenticatorHelper.defaultProfileTransform,
  scopes: {
    required: [],
  },
  initialize({ callbackUrl, config }) {
    const clientId = config.getString('clientId');
    const clientSecret = config.getString('clientSecret');
    const coderUrl = config.getString('deploymentUrl');

    const strategy = new OAuth2Strategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackUrl,
        authorizationURL: `${coderUrl}/oauth2/authorize`,
        tokenURL: `${coderUrl}/oauth2/tokens`,
        customHeaders: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
      (
        accessToken: string,
        refreshToken: string,
        params: any,
        fullProfile: PassportProfile,
        done: PassportOAuthDoneCallback,
      ) => {
        done(
          undefined,
          {
            fullProfile,
            params,
            accessToken,
          },
          { refreshToken },
        );
      },
    );

    (strategy as any).userProfile = async function fetchUserProfile(
      accessToken: string,
      done: (err?: Error | null, profile?: any) => void,
    ) {
      try {
        const response = await fetch(`${coderUrl}/api/v2/users/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response
            .text()
            .catch(() => response.statusText);
          done(
            new Error(
              `Failed to fetch Coder user profile (${response.status}): ${errorText}`,
            ),
          );
          return;
        }

        const userData = await response.json();

        const profile: PassportProfile = {
          id: userData.id,
          username: userData.username,
          displayName: userData.name || userData.username,
          emails: userData.email ? [{ value: userData.email }] : undefined,
          photos: userData.avatar_url
            ? [{ value: userData.avatar_url }]
            : undefined,
          provider: 'coder',
        };

        done(null, profile);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while fetching user profile';
        done(new Error(`Coder authentication failed: ${errorMessage}`));
      }
    };

    return PassportOAuthAuthenticatorHelper.from(strategy);
  },

  async start(input, ctx) {
    return ctx.start(input, {});
  },

  async authenticate(input, ctx) {
    return ctx.authenticate(input, {});
  },

  async refresh(input, ctx) {
    return ctx.refresh(input);
  },
});
