# Plugin API reference - classes

This is the main documentation page for the exported classes for `backstage-plugin-devcontainers-backkend`:

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
- The appending/removal process for tags works as follows:
  1.  An entity provider re-validates its data and ingests a new entity
  2.  The processor will run a pre-process step to determine if the dev containers tag (which defaults to `devcontainers`) should be added.
  3.  If the tag is added, this entity will eventually be added if it is brand new, or if there is a matching entity on file, be reconciled with it
  4.  During the reconciliation process, the existing entity will have the new tag added if the new version had it. However, if the new entity does not have the tag, the existing entity will lose the tag during reconciliation.
  5.  Unless another plugin adds the same tag, the only way to ensure that the tag stays applied to the entities available in the UI is by ensuring that the tag is included at each re-validation step.
