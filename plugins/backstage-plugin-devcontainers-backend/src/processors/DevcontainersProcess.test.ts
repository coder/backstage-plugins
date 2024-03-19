import { ConfigReader } from '@backstage/config';
import { createLogger } from 'winston';
import {
  DevcontainersProcessor,
  PROCESSOR_NAME_PREFIX,
} from './DevcontainersProcessor';

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
    it('Returns unmodified entity when entity is not component with catalog data', async () => {
      expect.hasAssertions();
    });

    it("Returns an unmodified component entity when the entity's repo does not match the devcontainers pattern", async () => {
      expect.hasAssertions();
    });

    it("Produces a new component entity with the devcontainers tag when the entity's repo matches the devcontainers pattern", async () => {
      expect.hasAssertions();

      // Make sure that there are not mutations in this case
    });

    it('Emits an error when a component entity supports devcontainers, but the repo query fails', async () => {
      expect.hasAssertions();
    });
  });
});
