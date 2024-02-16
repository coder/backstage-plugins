import '@testing-library/jest-dom';
import { server } from './testHelpers/server';
import { cleanUpAfterEachHelpers } from './testHelpers/setup';

beforeAll(() => server.listen());
afterAll(() => server.close());

afterEach(() => {
  server.resetHandlers();
  cleanUpAfterEachHelpers();
});
