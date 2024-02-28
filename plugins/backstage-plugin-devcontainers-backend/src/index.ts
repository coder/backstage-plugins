import { CatalogProcessor } from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { UrlReaders, UrlReader } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import { Logger } from 'winston';

const DEVCONTAINERS_TAG = 'devcontainers';

type ProcessorOptions = Readonly<{
  eraseTags: boolean;
}>;

type FromConfigOptions = Readonly<
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

  static fromConfig(config: Config, configOptions: FromConfigOptions) {
    const processorOptions: ProcessorOptions = {
      eraseTags: configOptions.eraseTags ?? false,
    };

    const reader = UrlReaders.default({ config, logger: configOptions.logger });
    return new DevcontainersProcessor(reader, processorOptions);
  }

  getProcessorName(): string {
    return 'coder/devcontainers';
  }

  async postProcessEntity(entity: Entity): Promise<Entity> {
    console.log('>>>>>>>>>>>>>>>>>>', entity.kind);
    if (entity.kind !== 'Component') {
      return entity;
    }

    // TODO: use logger and make some nice logs
    console.log('>>>>>>>>>>>>>>>>>>', typeof entity.metadata.tags);
    console.log('>>>>>>>>>>>>>>>>>>', entity);

    // TODO: what about monorepos?
    // TODO: is this the right URL?
    const url =
      entity.metadata.annotations?.['backstage.io/source-location'] ?? '';
    const cleanUrl = url.replace(/^url:/, '');

    /*
      TODO: need to test globs, should find from root and recursive

      TODO: either test these three or maybe just devcontainer.json?
      .devcontainer/devcontainer.json
      .devcontainer.json
      .devcontainer/<folder>/devcontainer.json (where <folder> is a sub-folder, one level deep)
    */
    const isGithubComponent = cleanUrl.includes('github.com');
    if (!isGithubComponent) {
      const skipTagErase =
        !this.options.eraseTags ||
        !Array.isArray(entity.metadata.tags) ||
        entity.metadata.tags.length === 0;

      if (skipTagErase) {
        return entity;
      }

      return {
        ...entity,
        metadata: {
          ...entity.metadata,
          tags: entity.metadata.tags?.filter(t => t !== DEVCONTAINERS_TAG),
        },
      };
    }

    const fullSearchPath = `${cleanUrl}.devcontainer/devcontainer.json`;
    const results = await this.urlReader.search(fullSearchPath);
    console.log('>>>>', results);

    // TODO: add devcontainer tag only if we found a devcontainer.
    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        tags: [...(entity.metadata.tags ?? []), 'devcontainers'],
      },
    };
  }
}

export * from './service/router';
