import { ConfigReader } from '@backstage/config';
import { type Logger, createLogger } from 'winston';
import {
  DevcontainersProcessor,
  PROCESSOR_NAME_PREFIX,
} from './DevcontainersProcessor';

function makeLogger(): Logger {
  return createLogger({
    silent: true,
  });
}

describe(`${DevcontainersProcessor.name}`, () => {
  describe('getProcessorName', () => {
    it('Should use Coder prefix in the output', () => {
      const processor = DevcontainersProcessor.fromConfig(
        new ConfigReader({}),
        { logger: makeLogger() },
      );

      const name = processor.getProcessorName();
      expect(name).toMatch(new RegExp(`^${PROCESSOR_NAME_PREFIX}`));
    });
  });

  describe('preProcessEntity', () => {
    it('Should preprocess data or something? I dunno', async () => {
      expect.hasAssertions();
    });
  });
});
