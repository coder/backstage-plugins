import type {
  UrlReaderServiceReadUrlOptions as ReadUrlOptions,
  UrlReaderServiceReadUrlResponse as ReadUrlResponse,
  UrlReaderServiceSearchResponse as SearchResponse,
  UrlReaderService as UrlReader,
} from '@backstage/backend-plugin-api';
import { mockServices } from '@backstage/backend-test-utils';
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

type MockFile = Readonly<{
  url: string;
  content: string;
}>;

const defaultFiles: readonly MockFile[] = [
  { url: mockUrlRoot, content: 'blah' },
];

type ThrowCallback = (
  url: string,
  readOptions: ReadUrlOptions | undefined,
) => never;

type SetupOptions = Readonly<{
  tagName?: string;
  files?: readonly MockFile[];

  // It'd arguably be better to define all of these via mapped types, but I felt
  // like it made the code too hard to follow if you don't know the TS syntax.
  // There should be one callback for each property on UrlReader
  readTreeThrowCallback?: ThrowCallback;
  readUrlThrowCallback?: ThrowCallback;
  searchThrowCallback?: ThrowCallback;
}>;

function setupProcessor(options?: SetupOptions) {
  // Not using all properties from SetupOptions just yet
  const {
    readUrlThrowCallback,
    searchThrowCallback,
    files = defaultFiles,
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
        files: files.map(file => ({
          url: file.url,
          content: async () => Buffer.from(file.content),
        })),
      };
    }),

    // Have to define as const to retain the Jest type information on the mock
    // callbacks
  } as const satisfies UrlReader;

  const processor = new DevcontainersProcessor({
    tagName,
    urlReader: mockReader,
    logger: mockServices.logger.mock(),
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
      expect(outputEntity.metadata.tags).toContain(DEFAULT_TAG_NAME);

      // Rest of test asserts that no mutations happened
      expect(outputEntity).not.toBe(inputEntity);
      expect(inputEntity).toEqual(inputSnapshot);

      const metadataCompare = structuredClone(inputSnapshot.metadata);
      metadataCompare.annotations = {
        ...(metadataCompare.annotations ?? {}),
        vsCodeUrl:
          'vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/example-company/example-repo',
      };
      delete metadataCompare.tags;

      expect(outputEntity).toEqual(
        expect.objectContaining({
          ...inputSnapshot,
          metadata: expect.objectContaining(metadataCompare),
        }),
      );
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
      expect(outputEntity.metadata.tags).toContain(customTag);

      // Rest of test asserts that no mutations happened
      expect(outputEntity).not.toBe(inputEntity);
      expect(inputEntity).toEqual(inputSnapshot);

      const metadataCompare = structuredClone(inputSnapshot.metadata);
      metadataCompare.annotations = {
        ...(metadataCompare.annotations ?? {}),
        vsCodeUrl:
          'vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/example-company/example-repo',
      };
      delete metadataCompare.tags;

      expect(outputEntity).toEqual(
        expect.objectContaining({
          ...inputSnapshot,
          metadata: expect.objectContaining(metadataCompare),
        }),
      );
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
