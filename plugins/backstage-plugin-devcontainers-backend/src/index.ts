/**
 * @todo Add nice backend logging for files (probably using Winston)
 * @todo Figure out if monorepos affect the parsing logic at all
 * @todo Verify that all URLs are correct and will always succeed
 * @todo Test out globs, particularly for root/recursive searches
 * @todo Determine how exactly we'll be detecting devcontainer.json files. Three
 *       likely options:
 *       - .devcontainer/devcontainer.json
 *       - .devcontainer.json
 *       - .devcontainer/<folder>/devcontainer.json
 *         (where <folder> is a sub-folder, one level deep)
 */
import { type CatalogProcessor } from '@backstage/plugin-catalog-node';
import { type Entity } from '@backstage/catalog-model';
import { type Config } from '@backstage/config';
import { type Logger } from 'winston';
import { type UrlReader, UrlReaders } from '@backstage/backend-common';
import { ANNOTATION_SOURCE_LOCATION } from '@backstage/catalog-model';

const DEFAULT_TAG_NAME = 'devcontainers';

type ProcessorOptions = Readonly<{
  tagName: string;
  eraseTags: boolean;
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
      tagName: options.tagName ?? DEFAULT_TAG_NAME,
      eraseTags: options.eraseTags ?? false,
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

  async preProcessEntity(entity: Entity): Promise<Entity> {
    if (entity.kind !== 'Component') {
      return entity;
    }

    const cleanUrl = (
      entity.metadata.annotations?.[ANNOTATION_SOURCE_LOCATION] ?? ''
    ).replace(/^url:/, '');

    const isGithubComponent = cleanUrl.includes('github.com');
    if (!isGithubComponent) {
      return this.eraseTag(entity, DEFAULT_TAG_NAME);
    }

    const fullSearchPath = `${cleanUrl}.devcontainer/devcontainer.json`;
    const tagDetected = await this.searchFiles(fullSearchPath);
    if (tagDetected) {
      return this.addTag(entity, DEFAULT_TAG_NAME);
    }

    return this.eraseTag(entity, DEFAULT_TAG_NAME);
  }

  private addTag(entity: Entity, newTag: string): Entity {
    if (entity.metadata.tags?.includes(newTag)) {
      return entity;
    }

    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        tags: [...(entity.metadata?.tags ?? []), newTag],
      },
    };
  }

  private eraseTag(entity: Entity, targetTag: string): Entity {
    const skipTagErasure =
      !this.options.eraseTags ||
      !Array.isArray(entity.metadata.tags) ||
      entity.metadata.tags.length === 0;

    if (skipTagErasure) {
      return entity;
    }

    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        tags: entity.metadata.tags?.filter(tag => tag !== targetTag),
      },
    };
  }

  private async searchFiles(glob: string): Promise<boolean> {
    const response = await this.urlReader.search(glob);

    // Placeholder stub until we look into the URLReader more. File traversal
    // via the API calls could be expensive; probably want to make sure that we
    // do a few checks and early returns to ensure that we're only calling this
    // method when necessary
    return response.files.some(f => f.url.includes(glob));
  }
}

export * from './service/router';
