import {
  type ReadUrlResponse,
  type ReadUrlOptions,
  type SearchResponse,
  type UrlReader,
  getVoidLogger,
} from '@backstage/backend-common';
import { NotFoundError } from '@backstage/errors';
import type { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  type Entity,
  ANNOTATION_SOURCE_LOCATION,
} from '@backstage/catalog-model';
import {
  DEFAULT_TAG_NAME,
  DevcontainersProcessor,
  PROCESSOR_NAME_PREFIX,
} from './DevcontainersProcessor';

const mockUrlRoot = 'https://github.com/example-company/example-repo';

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

type SetupOptions = Readonly<{
  tagName?: string;

  searchThrowCallback?: (
    url: string,
    readOptions: ReadUrlOptions | undefined,
  ) => never;

  readUrlThrowCallback?: (
    url: string,
    readOptions: ReadUrlOptions | undefined,
  ) => never;
}>;

function setupProcessor(options?: SetupOptions) {
  const {
    searchThrowCallback,
    readUrlThrowCallback,
    tagName = DEFAULT_TAG_NAME,
  } = options ?? {};

  /**
   * Tried to get this working as more of an integration test that used MSW, but
   * couldn't figure out how to bring in the right dependencies in time. So this
   * is more of a unit test for now (which might be all we really need?)
   *
   * Likely candidates for making this work are ConfigReader from
   * @backstage/config or GithubCredentialsProvider from @backstage/integrations
   *
   * setupRequestMockHandlers from @backstage/backend-test-utils will be helpful
   * for hooking up MSW
   */
  const mockReader = {
    readTree: jest.fn(),
    readUrl: jest.fn(async (url, readOptions): Promise<ReadUrlResponse> => {
      readUrlThrowCallback?.(url, readOptions);

      return {
        buffer: jest.fn(),
        stream: jest.fn(),
      };
    }),
    search: jest.fn(async (url, readOptions): Promise<SearchResponse> => {
      searchThrowCallback?.(url, readOptions);

      return {
        etag: readOptions?.etag ?? 'fallback etag',
        files: [
          {
            content: () => Promise.resolve(new Buffer('blah')),
            url: mockUrlRoot,
          },
        ],
      };
    }),
  } as const satisfies UrlReader;

  const processor = new DevcontainersProcessor(mockReader, {
    tagName,
    logger: getVoidLogger(),
  });

  return { mockReader, processor } as const;
}

describe(`${DevcontainersProcessor.name}`, () => {
  describe('getProcessorName', () => {
    it('Should use Coder prefix in the output', () => {
      const { processor } = setupProcessor();
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

      const { processor } = setupProcessor();
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

      const { processor } = setupProcessor();
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
      const { processor, mockReader } = setupProcessor();

      const outputEntity = await processor.preProcessEntity(
        inputEntity,
        baseLocation,
        jest.fn(),
      );

      expect(mockReader.readUrl).toHaveBeenCalled();

      expect(outputEntity).not.toEqual(inputEntity);
      expect(inputEntity.metadata.tags).toEqual(inputSnapshot.metadata.tags);
      expect(inputEntity).toEqual(inputSnapshot);

      expect(outputEntity.metadata.tags).toContain(DEFAULT_TAG_NAME);
    });

    it('Creates new entity by using custom devcontainers tag when it is provided', async () => {
      const customTag = 'blah';
      const inputEntity = { ...baseEntity };
      const inputSnapshot = structuredClone(inputEntity);
      const { processor, mockReader } = setupProcessor({ tagName: customTag });

      const outputEntity = await processor.preProcessEntity(
        inputEntity,
        baseLocation,
        jest.fn(),
      );

      expect(mockReader.readUrl).toHaveBeenCalled();

      expect(outputEntity).not.toEqual(inputEntity);
      expect(inputEntity.metadata.tags).toEqual(inputSnapshot.metadata.tags);
      expect(inputEntity).toEqual(inputSnapshot);

      expect(outputEntity.metadata.tags).toContain(customTag);
    });

    it('Emits an error entity when reading from the URL throws anything other than a NotFoundError', async () => {
      const emitter = jest.fn();
      const { processor } = setupProcessor({
        readUrlThrowCallback: () => {
          throw new Error('This was unexpected');
        },
      });

      await processor.preProcessEntity(baseEntity, baseLocation, emitter);
      expect(emitter).toHaveBeenCalled();
    });

    it('Does not emit anything if a NotFoundError is thrown', async () => {
      const emitter = jest.fn();
      const { processor } = setupProcessor({
        readUrlThrowCallback: () => {
          throw new NotFoundError("Didn't find the file");
        },
      });

      await processor.preProcessEntity(baseEntity, baseLocation, emitter);
      expect(emitter).not.toHaveBeenCalled();
    });
  });
});
