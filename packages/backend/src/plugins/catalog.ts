import { type Router } from 'express';
import { type PluginEnvironment } from '../types';
import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-catalog-backend-module-scaffolder-entity-model';
import { GithubOrgEntityProvider } from '@backstage/plugin-catalog-backend-module-github';
import { DevcontainersProcessor } from '@coder/backstage-plugin-devcontainers-backend';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  builder.addEntityProvider(
    GithubOrgEntityProvider.fromConfig(env.config, {
      id: 'production',
      orgUrl: 'https://github.com/coder',
      logger: env.logger,
      schedule: env.scheduler.createScheduledTaskRunner({
        frequency: { minutes: 60 },
        timeout: { minutes: 15 },
      }),
    }),
  );

  builder.addProcessor(new ScaffolderEntitiesProcessor());
  builder.addProcessor(
    DevcontainersProcessor.fromConfig(env.config, {
      logger: env.logger,
      eraseTags: false,
    }),
  );

  const { processingEngine, router } = await builder.build();
  await processingEngine.start();
  return router;
}
