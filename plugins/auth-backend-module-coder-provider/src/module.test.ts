import { authModuleCoderProvider } from './module';
import { mockServices, startTestBackend } from '@backstage/backend-test-utils';
import { authProvidersExtensionPoint } from '@backstage/plugin-auth-node';

describe('authModuleCoderProvider', () => {
  it('should register the coder auth provider', async () => {
    const providersExtensionPoint = {
      registerProvider: jest.fn(),
    };

    await startTestBackend({
      extensionPoints: [[authProvidersExtensionPoint, providersExtensionPoint]],
      features: [
        authModuleCoderProvider,
        mockServices.rootConfig.factory({
          data: {
            app: { baseUrl: 'http://localhost:3000' },
            backend: { baseUrl: 'http://localhost:7007' },
          },
        }),
      ],
    });

    expect(providersExtensionPoint.registerProvider).toHaveBeenCalledWith({
      providerId: 'coder',
      factory: expect.any(Function),
    });
  });

  it('should register provider with correct ID', async () => {
    const providersExtensionPoint = {
      registerProvider: jest.fn(),
    };

    await startTestBackend({
      extensionPoints: [[authProvidersExtensionPoint, providersExtensionPoint]],
      features: [
        authModuleCoderProvider,
        mockServices.rootConfig.factory({
          data: {
            app: { baseUrl: 'http://localhost:3000' },
            backend: { baseUrl: 'http://localhost:7007' },
          },
        }),
      ],
    });

    const registerCall = providersExtensionPoint.registerProvider.mock.calls[0];
    expect(registerCall[0].providerId).toBe('coder');
  });
});
