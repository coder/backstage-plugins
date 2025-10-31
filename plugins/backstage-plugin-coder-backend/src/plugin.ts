import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

/**
 * A plugin that centralizes all concerns for integrating a Coder deployment
 * with a Backstage backend.
 *
 * @public
 */
export const backstagePluginCoderBackendPlugin = createBackendPlugin({
  pluginId: 'backstage-plugin-coder-backend',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, config }) {
        const router = await createRouter({ logger, config });
        httpRouter.use(router);
      },
    });
  },
});
