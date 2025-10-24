import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

////////////////////////////////////////////////////////////////////////////////
///// Start of code included with a fresh Backstage install ////////////////////
////////////////////////////////////////////////////////////////////////////////

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

// scaffolder plugin
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(
  import('@backstage/plugin-scaffolder-backend-module-notifications'),
);

// techdocs plugin
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
// See https://backstage.io/docs/auth/guest/provider

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// search plugin
backend.add(import('@backstage/plugin-search-backend'));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collators
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// kubernetes plugin
backend.add(import('@backstage/plugin-kubernetes-backend'));

// notifications and signals plugins
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

////////////////////////////////////////////////////////////////////////////////
///// End of code included with a fresh Backstage install //////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Integrate support for the Coder GitHub org. Configured via app-config.yaml
 * @see {@link https://backstage.io/docs/integrations/github/discovery/}
 */
backend.add(import('@backstage/plugin-catalog-backend-module-github'));

/**
 * Add the official auth provider for GitHub. This also has a lot of its values
 * configured via the app-config.yaml files.
 * @see {@link https://backstage.io/docs/auth/github/provider/}
 */
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

/**
 * @todo Update the Devcontainers plugin to use the New Backend System.
 *
 * Previous setup (that will NOT work with the new system):
 * ```
 * builder.addProcessor(
 *   DevcontainersProcessor.fromConfig(env.config, {
 *     logger: env.logger,
 *   }),
 * );
 * ```
 */
// backend.add(import('@coder/backstage-plugin-devcontainers-backend'));

backend.add(import('@coder/backstage-plugin-coder-backend'));

backend.start();
