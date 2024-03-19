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
  target:
    'https://github.com/Parkreiner/python-project/blob/main/catalog-info.yaml',
};

function makeProcessor(tagName?: string): DevcontainersProcessor {
  return DevcontainersProcessor.fromConfig(new ConfigReader({}), {
    tagName,
    logger: createLogger({ silent: true }),
  });
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

    it("Returns an unmodified component entity when the entity's repo does not match the devcontainers pattern", async () => {
      const invalidLocation: LocationSpec = {
        ...baseLocation,
        target: 'definitely not valid',
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

    it("Produces a new component entity with the devcontainers tag when the entity's repo matches the devcontainers pattern", async () => {
      const inputSnapshot = structuredClone(baseEntity);
      const processor = makeProcessor(DEFAULT_TAG_NAME);

      const outputEntity = await processor.preProcessEntity(
        baseEntity,
        baseLocation,
        jest.fn(),
      );

      // Assert no mutations
      expect(outputEntity).not.toEqual(baseEntity);
      expect(baseEntity.metadata.tags).toBe(inputSnapshot.metadata.tags);
      expect(baseEntity).toEqual(inputSnapshot);

      // Assert that tag was appended
      expect(outputEntity.metadata.tags).toContain(DEFAULT_TAG_NAME);
    });

    it.skip('Creates new entity by using custom devcontainers tag when it is provided', async () => {
      // 99% sure that this test case will fail with our current code; use TDD
      // to assert that the user code is not working, and then fix the issue
      expect.hasAssertions();
    });

    it.skip('Emits an error when a component entity supports devcontainers, but the repo query fails', async () => {
      const emitter: CatalogProcessorEmit = jest.fn();
      expect(emitter).toHaveBeenCalled();
    });
  });
});
