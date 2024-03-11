# Plugin API reference – React components

This is the main documentation page for the Devcontainer plugin's exported classes.

## Class list

- [`DevcontainersProcessor`](#devcontainersprocessor)

## `DevcontainersProcessor`

This class provides a custom [catalog processor](https://backstage.io/docs/features/software-catalog/external-integrations/#custom-processors) for entity data that comes from GitHub, GitLab, or BitBucket.

### Type signature

```tsx
type ProcessorOptions = Readonly<{
  tagName: string;
  eraseTags: boolean;
  logger: Logger;
}>;

type ProcessorSetupOptions = Readonly<
  Partial<ProcessorOptions> & {
    logger: Logger;
  }
>;

class DevcontainersProcessor implements CatalogProcessor {
  constructor(urlReader: UrlReader, options: ProcessorOptions) {}

  static fromConfig(
    readerConfig: Config,
    options: ProcessorSetupOptions,
  ): DevcontainersProcessor;

  getProcessorName(): string;
  async preProcessEntity(
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity>;
}
```

#### Notes for type definitions

- The type definition for `CatalogProcessor` comes from `@backstage/plugin-catalog-node`
- The type definition for `Config` comes from `@backstage/config`
- The type definition for `UrlReader` comes from `@backstage/backend-common`

### Sample usage

```tsx
// Inside your backend deployment's catalog.ts file
export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);

  // Insert other setup steps here

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

### Throws

- The `preProcessEntity` method will emit an entity `generalError` when it is unable to read the URL data for a given repository.

### Notes

- This class is designed to be instantiated either through the `fromConfig` method or from the raw constructor. `fromConfig` will set up the class instance with a set of "sensible" default values.
  - If the value of `tagName` is not specified for `fromConfig`, the class will default to the value `devcontainers`
