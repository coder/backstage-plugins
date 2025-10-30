import { setupServer } from 'msw/node';
import { mockServices } from '@backstage/backend-test-utils';
import { coderAuthenticator } from './authenticator';

const mockCoderUrl = 'https://test.coder.com';

const server = setupServer();

describe('coderAuthenticator', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('initialization', () => {
    it('should initialize without errors with valid config', () => {
      const config = mockServices.rootConfig({
        data: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          deploymentUrl: mockCoderUrl,
        },
      });

      const result = coderAuthenticator.initialize({
        callbackUrl: 'http://localhost:7007/api/auth/coder/handler/frame',
        config,
      });

      expect(result).toBeDefined();
    });

    it('should fail initialization when clientId is missing', () => {
      const config = mockServices.rootConfig({
        data: {
          clientSecret: 'test-client-secret',
          deploymentUrl: mockCoderUrl,
        },
      });

      expect(() =>
        coderAuthenticator.initialize({
          callbackUrl: 'http://localhost:7007/api/auth/coder/handler/frame',
          config,
        }),
      ).toThrow('clientId');
    });

    it('should fail initialization when clientSecret is missing', () => {
      const config = mockServices.rootConfig({
        data: {
          clientId: 'test-client-id',
          deploymentUrl: mockCoderUrl,
        },
      });

      expect(() =>
        coderAuthenticator.initialize({
          callbackUrl: 'http://localhost:7007/api/auth/coder/handler/frame',
          config,
        }),
      ).toThrow('clientSecret');
    });

    it('should fail initialization when deploymentUrl is missing', () => {
      const config = mockServices.rootConfig({
        data: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
      });

      expect(() =>
        coderAuthenticator.initialize({
          callbackUrl: 'http://localhost:7007/api/auth/coder/handler/frame',
          config,
        }),
      ).toThrow('deploymentUrl');
    });
  });

  describe('required scopes', () => {
    it('should not require any OAuth scopes', () => {
      expect(coderAuthenticator.scopes?.required).toEqual([]);
    });
  });
});

