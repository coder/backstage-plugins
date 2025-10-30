import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  createOAuthProviderFactory,
  commonSignInResolvers,
  createSignInResolverFactory,
} from '@backstage/plugin-auth-node';
import { coderAuthenticator } from './authenticator';

/**
 * Auth provider integration for Coder OAuth
 *
 * @public
 */
export const authModuleCoderProvider = createBackendModule({
  pluginId: 'auth',
  moduleId: 'coder-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
      },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'coder',
          factory: createOAuthProviderFactory({
            authenticator: coderAuthenticator,
            signInResolverFactories: {
              ...commonSignInResolvers,
              usernameMatchingUserEntityName: createSignInResolverFactory({
                create() {
                  return async (info, ctx) => {
                    const { result } = info;
                    const username = result.fullProfile.username;

                    if (!username) {
                      throw new Error('Coder profile is missing username');
                    }

                    return ctx.signInWithCatalogUser({
                      entityRef: {
                        kind: 'User',
                        name: username,
                      },
                    });
                  };
                },
              }),
            },
          }),
        });
      },
    });
  },
});
