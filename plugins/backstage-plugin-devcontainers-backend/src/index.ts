import { CatalogProcessor } from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { UrlReaders, UrlReader } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import { Logger } from 'winston';

export class DevcontainersProcessor implements CatalogProcessor {
  static fromConfig(config: Config, options: { logger: Logger }) {
    const reader = UrlReaders.default({ logger: options.logger, config });
    return new DevcontainersProcessor(reader);
  }

  constructor(private readonly urlReader: UrlReader) {
    // Nothing to do.
  }

  getProcessorName(): string {
    return 'devcontainers';
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
    const url =
      entity.metadata.annotations?.['backstage.io/source-location'] ?? ''; // TODO: is this the right URL?

    // TODO: need to test globs, should find from root and recursive
    // TODO: either test these three or maybe just devcontainer.json?
    // .devcontainer/devcontainer.json
    // .devcontainer.json
    // .devcontainer/<folder>/devcontainer.json (where <folder> is a sub-folder, one level deep)
    const isGithubComponent = url.includes('github.com');
    if (!isGithubComponent) {
      return entity;
    }

    const cleanUrl = url.replace(/^url:/, '');
    const fullSearchPath = `${cleanUrl}.devcontainer/devcontainer.json`;
    const results = await this.urlReader.search(fullSearchPath);
    console.log('>>>>', results);

    // TODO: add devcontainer tag only if we found a devcontainer.
    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        tags: ['devcontainers', ...(entity.metadata.tags ?? [])],
      },
    };
  }
}

export * from './service/router';
