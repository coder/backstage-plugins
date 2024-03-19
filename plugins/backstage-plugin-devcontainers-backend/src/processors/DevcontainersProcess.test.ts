import { ConfigReader } from '@backstage/config';
import { createLogger } from 'winston';
import {
  type Entity,
  ANNOTATION_SOURCE_LOCATION,
} from '@backstage/catalog-model';
import {
  DevcontainersProcessor,
  PROCESSOR_NAME_PREFIX,
} from './DevcontainersProcessor';
import { LocationSpec } from '@backstage/plugin-catalog-common';

const mockUrlRoot = 'https://www.github.com/example-company/example-repo';
const baseEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'metadata',
    tags: [],
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

function makeProcessor(): DevcontainersProcessor {
  return DevcontainersProcessor.fromConfig(new ConfigReader({}), {
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
    it('Returns unmodified entity when type is not "Component"', async () => {
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
      // Make sure that this test case asserts that there are no mutations to
      // the original entity
      expect.hasAssertions();
    });

    it('Creates new entity with custom devcontainers tag if provided', async () => {
      // 99% sure that this test case will fail with our current code; use TDD
      // to assert that the user code is not working, and then fix the issue
      expect.hasAssertions();
    });

    it('Emits an error when a component entity supports devcontainers, but the repo query fails', async () => {
      expect.hasAssertions();
    });
  });
});
