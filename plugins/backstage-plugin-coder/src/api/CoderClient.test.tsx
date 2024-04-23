import React, { useEffect } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { act, render, waitFor } from '@testing-library/react';
import {
  getMockDiscoveryApi,
  getMockIdentityApi,
  mockCoderAuthToken,
  setupCoderClient,
} from '../testHelpers/mockBackstageData';
import { CoderClient, CoderClientSnapshot } from './CoderClient';
import { CoderTokenAuth } from './CoderTokenAuth';

type TokenAuthSetupOutput = Readonly<{
  coderClientApi: CoderClient;
  authApi: CoderTokenAuth;
}>;

function setupCoderClientWithTokenAuth(): TokenAuthSetupOutput {
  const authApi = new CoderTokenAuth();
  const discoveryApi = getMockDiscoveryApi();
  const identityApi = getMockIdentityApi();

  const { coderClientApi } = setupCoderClient({
    discoveryApi,
    identityApi,
    authApi,
  });

  return { authApi, coderClientApi };
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
    describe('validateAuth method', () => {
      it('Will update the underlying auth instance when a query succeeds', async () => {
        const { coderClientApi, authApi } = setupCoderClientWithTokenAuth();

        authApi.registerNewToken(mockCoderAuthToken);
        const validationResult = await coderClientApi.validateAuth();

        expect(validationResult).toBe(true);
        expect(authApi.isTokenValid).toBe(true);

        const clientSnapshot = coderClientApi.getStateSnapshot();
        expect(clientSnapshot).toEqual(
          expect.objectContaining<Partial<CoderClientSnapshot>>({
            isAuthValid: true,
          }),
        );
      });

      it('Will update the underlying auth instance when a query fails', async () => {
        const { coderClientApi, authApi } = setupCoderClientWithTokenAuth();

        authApi.registerNewToken('Definitely not a valid token');
        const validationResult = await coderClientApi.validateAuth();

        expect(validationResult).toBe(false);
        expect(authApi.isTokenValid).toBe(false);

        const clientSnapshot = coderClientApi.getStateSnapshot();
        expect(clientSnapshot).toEqual(
          expect.objectContaining<Partial<CoderClientSnapshot>>({
            isAuthValid: false,
          }),
        );
      });
    });
  });

  describe('State snapshot subscriptions', () => {
    it('Lets external systems subscribe to state changes', async () => {
      const { coderClientApi } = setupCoderClientWithTokenAuth();
      const onChange = jest.fn();
      coderClientApi.subscribe(onChange);

      await coderClientApi.validateAuth();
      expect(onChange).toHaveBeenCalled();
    });

    it('Lets external systems UN-subscribe to state changes', async () => {
      const { coderClientApi } = setupCoderClientWithTokenAuth();
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
      coderClientApi.subscribe(subscriber1);
      coderClientApi.subscribe(subscriber2);

      // Important that there's no await here. Do not want to pause the thread
      // of execution until after subscriber2 unsubscribes.
      void coderClientApi.validateAuth();
      coderClientApi.unsubscribe(subscriber2);

      await waitFor(() => expect(subscriber1).toHaveBeenCalled());
      expect(subscriber2).not.toHaveBeenCalled();
    });

    it('Provides tools to let React components bind re-renders to state changes', async () => {
      const { coderClientApi } = setupCoderClientWithTokenAuth();
      const onStateChange = jest.fn();

      const DummyReactComponent = () => {
        const reactiveStateSnapshot = useSyncExternalStore(
          coderClientApi.subscribe,
          coderClientApi.getStateSnapshot,
        );

        useEffect(() => {
          onStateChange();
        }, [reactiveStateSnapshot]);

        return null;
      };

      const { rerender } = render(<DummyReactComponent />);
      expect(onStateChange).toHaveBeenCalledTimes(1);

      await act(() => coderClientApi.validateAuth());
      expect(onStateChange).toHaveBeenCalledTimes(2);

      // Make sure that if the component re-renders from the top down (like a
      // parent state change), that does not cause the snapshot to lose its
      // stable reference
      rerender(<DummyReactComponent />);
      expect(onStateChange).toHaveBeenCalledTimes(2);
    });
  });
});
