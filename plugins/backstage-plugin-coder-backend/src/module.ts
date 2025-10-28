import { 
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 * Coder OAuth backend plugin for the new Backstage backend system.
 * 
 * This plugin provides OAuth authentication routes for Coder at /api/coder/oauth/callback.
 * 
 * @public
 */
export default createBackendPlugin({
  pluginId: 'coder',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, config, httpRouter }) {
        logger.info('Initializing Coder OAuth plugin');
        
        const router = await createRouter({
          logger: logger as any,
          config,
        });
        
        // Allow unauthenticated access to OAuth routes
        httpRouter.addAuthPolicy({
          path: '/oauth',
          allow: 'unauthenticated',
        });
        
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        
        // Register the router (will be mounted at /api/coder)
        httpRouter.use(router);
        
        logger.info('Coder OAuth plugin initialized at /api/coder');
      },
    });
  },
});

