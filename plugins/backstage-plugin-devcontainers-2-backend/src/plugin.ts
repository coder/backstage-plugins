import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  DEFAULT_TAG_NAME,
  DevcontainersProcessor,
} from './processors/DevcontainersProcessor';

/**
 * @todo 2025-10-24 - Even though the New Backend System is production ready,
 * and all of the official code examples don't use the alpha path, we're still
 * being forced to use the path for this import.
 *
 * Need to look into why, but it seems that Backstage's templating system (used
 * by the Yarn plugin) has the package pinned to 1.19.1 (even though the latest
 * is 1.31.4). Even trying to install a later version manually through Yarn
 * doesn't do anything.
 *
 * Need to figure out how to use a later version without forgoing the Yarn
 * plugin entirely, because the plugin makes maintainability a lot easier across
 * new Backstage releases.
 */
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';

/**
 * @public
 */
export const backstagePluginDevcontainersModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'backstage-plugin-devcontainers-backend',
  register: env => {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        urlReader: coreServices.urlReader,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ catalog, urlReader, logger, config }) {
        const tagName =
          config.getOptionalString('devcontainers.tagName') ?? DEFAULT_TAG_NAME;
        catalog.addProcessor(
          new DevcontainersProcessor({
            urlReader,
            logger,
            tagName,
          }),
        );
      },
    });
  },
});
