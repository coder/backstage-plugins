import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { setupRequestMockHandlers } from '@backstage/backend-test-utils';
import { getVoidLogger } from '@backstage/backend-common';
import type { LocationSpec } from '@backstage/plugin-catalog-common';
import { ConfigReader } from '@backstage/config';
import {
  type Entity,
  ANNOTATION_SOURCE_LOCATION,
} from '@backstage/catalog-model';
import {
  DEFAULT_TAG_NAME,
  DevcontainersProcessor,
  PROCESSOR_NAME_PREFIX,
} from './DevcontainersProcessor';

const sourceRoot = 'https://www.github.com';
const mockUrlRoot = `${sourceRoot}/absolutely-fake-company1930/example-repo`;

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
  presence: 'required',
  target: `${mockUrlRoot}/blob/main/catalog-info.yaml`,
};

function makeProcessor(tagName?: string): DevcontainersProcessor {
  const readerConfig = new ConfigReader({
    backend: {
      reading: {
        allow: [{ host: `${sourceRoot}/*` }, { host: 'localhost' }],
      },
    },
  });

  return DevcontainersProcessor.fromConfig(readerConfig, {
    tagName,
    logger: getVoidLogger(),
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
    const worker = setupServer();
    setupRequestMockHandlers(worker);

    worker.use(
      rest.get('*', (req, res, ctx) => {
        console.log(req);
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

    it("Produces a new component entity with the devcontainers tag when the entity's repo matches the devcontainers pattern", async () => {
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
      const customTag = 'blah';
      const inputEntity = { ...baseEntity };
      const inputSnapshot = structuredClone(inputEntity);
      const processor = makeProcessor(customTag);

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
      expect(outputEntity.metadata.tags).toContain(customTag);

      // 99% sure that this test case will fail with our current code; use TDD
      // to assert that the user code is not working, and then fix the issue
      expect.hasAssertions();
    });
  });
});
