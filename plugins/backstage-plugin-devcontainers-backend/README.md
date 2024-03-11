# @coder/backstage-plugin-devcontainers-backend

Automatically detect [development containers (devcontainer) files](https://containers.dev/) in repositories such as GitHub, GitLab, or BitBucket, and have Backstage tag them in the background!

## Screenshots

![View of the default table component displaying custom tag data](./screenshots/table-view.png)

## Features

_Note: While this plugin can be used standalone, it has been designed to be a backend companion to [`backstage-plugin-devcontainers-react`](../backstage-plugin-devcontainers-react/README.md)._

### Standalone features

- Automatically tag repos from GitHub/GitLab/BitBucket that contain some form of `devcontainers` support.
  - Repos are tagged as part of Backstage's [processing loop](https://backstage.io/docs/features/software-catalog/life-of-an-entity/#processing)

### When combined with the frontend plugin

- Provides an end-to-end solution for automatically managing tags for your Backstage installation, while letting you read them from custom hooks and components

## Setup

### Before you begin

Ensure that you have the following ready to go:

- A Backstage deployment that you can modify
- A GitHub/GitLab/BitBucket repository that has had a `devcontainers.json` file added to it. [VS Code has a quick-start guide for adding devcontainers to a repo](https://code.visualstudio.com/docs/devcontainers/create-dev-container).

_Note: While this plugin has been developed and published by Coder, no Coder installations are required._

### Installation

1. From your Backstage deployment's `backend` directory, run the following command:
   ```shell
   yarn --cwd packages/backend add @coder/backstage-plugin-devcontainers-backend
   ```
2. Navigate to the `backend` directory's `catalog.ts` file
3. Import your Source Control Manager provider of choice (Backstage has built in support for GitHub, GitLab, and BitBucket)

   ```ts
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

     // Rest of implementation
   }
   ```

4. Import the `DevcontainersProcessor` class, and register it with your plugin creator:

   ```ts
   export default async function createPlugin(
     env: PluginEnvironment,
   ): Promise<Router> {
     const builder = await CatalogBuilder.create(env);
     builder.addEntityProvider(/* GitHub setup */);

     builder.addProcessor(
       DevcontainersProcessor.fromConfig(env.config, {
         tagName: 'example', // Defaults to devcontainers
         logger: env.logger,
         eraseTags: false,
       }),
     );

     // Add any extra processors and handle setup here
   }
   ```

5. As your provider of choice re-validates data and emits more entity information, `DevcontainersProcessor` will automatically intercept the data and append or remove tags, based on whether the current repository has a devcontainers file!

Full example:

```tsx
// catalog.ts
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
```

## Limitations

At the time of the plugin launch, the backend `devcontainers` plugin has some limitations around how it is able to detect a `devcontainer.json` file. That is, it is only able to detect files that exist at the root of a repository, or one level below. If a file is located further down than that (such as in a large monorepo), the processor will be unable to detect the file.

We are currently investigating how to add support for deeper nesting. Does this sound like a feature that you could benefit from? Please open an issue – we would love to know more about your use case!

## API documentation

Please see the [directory for our API references](./docs/README.md) for additional information.

## Roadmap

This plugin is in active development. The following features are planned:

- TODO: Fill out list

## Contributing

This plugin is part of the Backstage community. We welcome contributions!

Welcome to the backstage-plugin-devcontainers backend plugin!

_This plugin was created through the Backstage CLI_
