import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  commonSignInResolvers,
  createOAuthProviderFactory,
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
            },
          }),
        });
      },
    });
  },
});
