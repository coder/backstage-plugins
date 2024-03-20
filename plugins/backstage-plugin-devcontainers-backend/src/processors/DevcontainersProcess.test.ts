import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { setupRequestMockHandlers } from '@backstage/backend-test-utils';
import type { LocationSpec } from '@backstage/plugin-catalog-common';
import type { CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import { ConfigReader } from '@backstage/config';
import {
  type Entity,
  ANNOTATION_SOURCE_LOCATION,
} from '@backstage/catalog-model';
import { createLogger } from 'winston';
import {
  DEFAULT_TAG_NAME,
  DevcontainersProcessor,
  PROCESSOR_NAME_PREFIX,
} from './DevcontainersProcessor';

const mockUrlRoot = 'https://www.github.com/example-company/example-repo';

const baseEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'metadata',
    tags: [], // Purposefully left empty
    annotations: {
      [ANNOTATION_SOURCE_LOCATION]: `${mockUrlRoot}/tree/main`,
    },
  },
};

const baseLocation: LocationSpec = {
  type: 'Component',
  presence: 'optional',
  target: `${mockUrlRoot}/blob/main/catalog-info.yaml`,
};

function makeProcessor(tagName?: string): DevcontainersProcessor {
  const logger = createLogger({ silent: true });
  const readerConfig = new ConfigReader({});
  return DevcontainersProcessor.fromConfig(readerConfig, { tagName, logger });
}

describe(`${DevcontainersProcessor.name}`, () => {
  describe('getProcessorName', () => {
    it('Should use Coder prefix in the output', () => {
      const processor = makeProcessor();
      const name = processor.getProcessorName();
      expect(name).toMatch(new RegExp(`^${PROCESSOR_NAME_PREFIX}`));
    });
  });

  describe('preProcessEntity', () => {
    const worker = setupServer();
    setupRequestMockHandlers(worker);

    worker.use(
      rest.all('https://www.github.com/*', (_, res, ctx) => {
        console.log('Blah');
        return res(ctx.status(200), ctx.json({ hah: 'yeah' }));
      }),
    );

    it('Returns unmodified entity whenever kind is not "Component"', async () => {
      /**
       * Formats taken from Backstage docs
       * @see {@link https://backstage.io/docs/features/software-catalog/descriptor-format/}
       */
      const otherEntityKinds: readonly string[] = [
        'Template',
        'API',
        'Group',
        'User',
        'Resource',
        'System',
        'Domain',
        'Location',
      ];

      const processor = makeProcessor();
      await Promise.all(
        otherEntityKinds.map(async kind => {
          const inputEntity = { ...baseEntity, kind };
          const inputSnapshot = structuredClone(inputEntity);

          const outputEntity = await processor.preProcessEntity(
            inputEntity,
            baseLocation,
            jest.fn(),
          );

          expect(outputEntity).toBe(inputEntity);
          expect(outputEntity).toEqual(inputSnapshot);
        }),
      );
    });

    it('Returns an unmodified component entity when location is not for catalog-info.yaml file', async () => {
      const invalidLocation: LocationSpec = {
        ...baseLocation,
        target: 'https://www.definitely-not-valid.com/fake-repo/cool.html',
      };

      const processor = makeProcessor();
      const inputSnapshot = structuredClone(baseEntity);

      const outputEntity = await processor.preProcessEntity(
        baseEntity,
        invalidLocation,
        jest.fn(),
      );

      expect(outputEntity).toBe(baseEntity);
      expect(outputEntity).toEqual(inputSnapshot);
    });

    it.only("Produces a new component entity with the devcontainers tag when the entity's repo matches the devcontainers pattern", async () => {
      const inputEntity = { ...baseEntity };
      const inputSnapshot = structuredClone(inputEntity);
      const processor = makeProcessor(DEFAULT_TAG_NAME);

      const outputEntity = await processor.preProcessEntity(
        inputEntity,
        baseLocation,
        jest.fn(),
      );

      // Assert no mutations
      expect(outputEntity).not.toEqual(inputEntity);
      expect(inputEntity.metadata.tags).toEqual(inputSnapshot.metadata.tags);
      expect(inputEntity).toEqual(inputSnapshot);

      // Assert that tag was appended
      expect(outputEntity.metadata.tags).toContain(DEFAULT_TAG_NAME);
    });

    it('Creates new entity by using custom devcontainers tag when it is provided', async () => {
      // 99% sure that this test case will fail with our current code; use TDD
      // to assert that the user code is not working, and then fix the issue
      expect.hasAssertions();
    });

    it('Emits an error when a component entity supports devcontainers, but the repo query fails', async () => {
      const emitter: CatalogProcessorEmit = jest.fn();
      expect(emitter).toHaveBeenCalled();
    });
  });
});
