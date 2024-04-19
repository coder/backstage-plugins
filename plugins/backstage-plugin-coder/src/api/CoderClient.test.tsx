import React from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { act, render, waitFor } from '@testing-library/react';
import {
  getMockDiscoveryApi,
  getMockIdentityApi,
  mockCoderAuthToken,
} from '../testHelpers/mockBackstageData';
import { CoderClient } from './CoderClient';
import { CoderTokenAuth } from './CoderTokenAuth';

type TokenAuthSetupOutput = Readonly<{
  clientApi: CoderClient;
  authApi: CoderTokenAuth;
}>;

function setupCoderClientWithTokenAuth(): TokenAuthSetupOutput {
  const authApi = new CoderTokenAuth();
  const discoveryApi = getMockDiscoveryApi();
  const identityApi = getMockIdentityApi();

  const clientApi = new CoderClient({
    apis: { discoveryApi, identityApi, authApi },
  });

  return { authApi, clientApi };
}

/**
 * @todo Decide if we want to test the SDK-like functionality (even as a
 * stopgap). Once we can import the methods from Coder, it might be safe for the
 * plugin to assume the methods will always work.
 *
 * Plus, the other test files making requests to the SDK to get specific data
 * should kick up any other issues.
 */
describe(`${CoderClient.name}`, () => {
  /**
   * Once the OAuth implementation is done, it probably makes sense to have test
   * cases specifically for that.
   */
  describe('With token auth', () => {
    describe.only('validateAuth method', () => {
      it('Will update the underlying auth instance when a query succeeds', async () => {
        const { clientApi, authApi } = setupCoderClientWithTokenAuth();

        authApi.registerNewToken(mockCoderAuthToken);
        const validationResult = await clientApi.validateAuth();

        expect(validationResult).toBe(true);
        expect(clientApi.isAuthValid).toBe(true);
        expect(authApi.isTokenValid).toBe(true);
      });

      it('Will update the underlying auth instance when a query fails', async () => {
        const { clientApi, authApi } = setupCoderClientWithTokenAuth();

        authApi.registerNewToken('Definitely not a valid token');
        const validationResult = await clientApi.validateAuth();

        expect(validationResult).toBe(false);
        expect(clientApi.isAuthValid).toBe(false);
        expect(authApi.isTokenValid).toBe(false);
      });
    });
  });

  describe('State snapshot subscriptions', () => {
    it('Lets external systems subscribe to state changes', async () => {
      const { clientApi } = setupCoderClientWithTokenAuth();
      const onChange = jest.fn();
      clientApi.subscribe(onChange);

      await clientApi.validateAuth();
      expect(onChange).toHaveBeenCalled();
    });

    it('Lets external systems UN-subscribe to state changes', async () => {
      const { clientApi } = setupCoderClientWithTokenAuth();
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();

      /**
       * Doing something a little sneaky to try accounting for something that
       * could happen in the real world. The setup is:
       *
       * 1. External system subscribes to client
       * 2. Client calls validateAuth, which is async and goes through the
       *    microtask queue
       * 3. During that brief window where we're waiting for the response to
       *    come back, the external system unsubscribes
       * 4. Promise resolves, and the auth state changes, but the old subscriber
       *    should *NOT* get notified because it's unsubscribed now
       */
      clientApi.subscribe(subscriber1);
      clientApi.subscribe(subscriber2);

      // Important that there's no await here. Do not want to pause the thread
      // of execution until after subscriber2 unsubscribes.
      void clientApi.validateAuth();
      clientApi.unsubscribe(subscriber2);

      await waitFor(() => expect(subscriber1).toHaveBeenCalled());
      expect(subscriber2).not.toHaveBeenCalled();
    });

    it('Provides tools to let React components bind re-renders to state changes', async () => {
      const { clientApi } = setupCoderClientWithTokenAuth();
      const onRender = jest.fn();

      const DummyReactComponent = () => {
        const reactiveStateSnapshot = useSyncExternalStore(
          clientApi.subscribe,
          clientApi.getStateSnapshot,
        );

        onRender(reactiveStateSnapshot);
        return null;
      };

      render(<DummyReactComponent />);
      expect(onRender).toHaveBeenCalledTimes(1);
      await act(() => clientApi.validateAuth());
      expect(onRender).toHaveBeenCalledTimes(2);
    });
  });
});
