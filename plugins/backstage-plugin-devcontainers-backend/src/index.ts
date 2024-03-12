import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  type CatalogProcessor,
  CatalogProcessorEmit,
  processingResult,
} from '@backstage/plugin-catalog-node';
import { type Entity } from '@backstage/catalog-model';
import { type Config } from '@backstage/config';
import { isError, NotFoundError } from '@backstage/errors';
import { type UrlReader, UrlReaders } from '@backstage/backend-common';
import { type Logger } from 'winston';

const DEFAULT_TAG_NAME = 'devcontainers';

type ProcessorOptions = Readonly<{
  tagName: string;
  logger: Logger;
}>;

type ProcessorSetupOptions = Readonly<
  Partial<ProcessorOptions> & {
    logger: Logger;
  }
>;

export class DevcontainersProcessor implements CatalogProcessor {
  private readonly urlReader: UrlReader;
  private readonly options: ProcessorOptions;

  constructor(urlReader: UrlReader, options: ProcessorOptions) {
    this.urlReader = urlReader;
    this.options = options;
  }

  static fromConfig(readerConfig: Config, options: ProcessorSetupOptions) {
    const processorOptions: ProcessorOptions = {
      tagName: options.tagName || DEFAULT_TAG_NAME,
      logger: options.logger,
    };

    const reader = UrlReaders.default({
      config: readerConfig,
      logger: options.logger,
    });

    return new DevcontainersProcessor(reader, processorOptions);
  }

  getProcessorName(): string {
    // Very specific name to avoid name conflicts
    return 'backstage-plugin-devcontainers-backend/devcontainers-processor';
  }

  async preProcessEntity(
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    // The location of a component should be the catalog-info.yaml file, but
    // check just to be sure.
    if (
      entity.kind !== 'Component' ||
      !location.target.endsWith('/catalog-info.yaml')
    ) {
      return entity;
    }

    // The catalog-info.yaml is not necessarily at the root of the repository.
    // For showing the tag, we only care that there is a devcontainer.json
    // somewhere in the catalog-info.yaml directory or below.  However, if this
    // is a subdirectory (for example a monorepo) or a branch other than the
    // default, VS Code will fail to open it.  We may need to skip adding the
    // tag for anything that is not the root of the default branch, if we can
    // get this information, or figure out a workaround.
    const rootUrl = location.target.replace(/\/catalog-info\.yaml$/, '');

    const entityLogger = this.options.logger.child({
      name: entity.metadata.name,
      rootUrl,
    });
    try {
      const jsonUrl = await this.findDevcontainerJson(rootUrl, entityLogger);
      entityLogger.info('Found devcontainer config', { url: jsonUrl });
      return this.addTag(entity, DEFAULT_TAG_NAME, entityLogger);
    } catch (error) {
      if (!isError(error) || error.name !== 'NotFoundError') {
        emit(
          processingResult.generalError(
            location,
            `Unable to read ${rootUrl}: ${error}`,
          ),
        );
        entityLogger.warn('Unable to read', { error });
      } else {
        entityLogger.info('Did not find devcontainer config');
      }
    }

    // When the entity goes through the processing loop again, it will not
    // contain the devcontainers tag that we added in the previous round, so we
    // will not need to remove it.  This also means we avoid mistakenly removing
    // any colliding tag added by the user or another plugin.
    return entity;
  }

  private addTag(entity: Entity, newTag: string, logger: Logger): Entity {
    if (entity.metadata.tags?.includes(newTag)) {
      return entity;
    }

    logger.info(`Adding "${newTag}" tag to component`);
    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        tags: [...(entity.metadata?.tags ?? []), newTag],
      },
    };
  }

  /**
   * Return the first devcontainer config file found at or below the provided
   * URL.  Throw any errors encountered or a NotFoundError if unable to find any
   * devcontainer config files, to match the style of UrlReader.readUrl which
   * throws when unable to find a file.
   *
   * The spec expects the config file to be in one of three locations:
   *   - .devcontainer/devcontainer.json
   *   - .devcontainer.json
   *   - .devcontainer/<dir>/devcontainer.json where <dir> is at most one
   *     level deep.
   */
  private async findDevcontainerJson(
    rootUrl: string,
    logger: Logger,
  ): Promise<string> {
    // This could possibly be simplified with a ** glob, but ** appears not to
    // match on directories that begin with a dot.  Unless there is an option
    // exposed to support dots, we will have to make individual queries.  But,
    // not every provider appears to support `search` anyway so getting static
    // files will result in wider support anyway.
    logger.info('Searching for devcontainer config', { url: rootUrl });
    const staticLocations = [
      '.devcontainer/devcontainer.json',
      '.devcontainer.json',
    ];
    for (const location of staticLocations) {
      // TODO: We could possibly store the ETag of the devcontainer we last
      // found and include that in the request, which should result in less
      // bandwidth if the provider supports ETags.  I am seeing the request
      // going off about every two minutes so it might be worth it.
      try {
        const fileUrl = `${rootUrl}/${location}`;
        await this.urlReader.readUrl(fileUrl);
        return fileUrl;
      } catch (error) {
        if (!isError(error) || error.name !== 'NotFoundError') {
          throw error;
        }
      }
    }

    // * does not seem to match on a dot either.  If we need to support
    // something like .devcontainer/.example/devcontainer.json then we either
    // need an option exposed to enable that or we will have to read the
    // sub-tree here and traverse it ourselves.  Note that not every provider
    // supports `search` or `readTree`.
    const globUrl = `${rootUrl}/.devcontainer/*/devcontainer.json`;
    const res = await this.urlReader.search(globUrl);
    const url = res.files[0]?.url;
    if (url === undefined) {
      throw new NotFoundError(`${globUrl} did not match any files`);
    }
    return url;
  }
}

export * from './service/router';
