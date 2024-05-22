import React from 'react';
import { renderHook } from '@testing-library/react';
import { act, waitFor } from '@testing-library/react';

import { TestApiProvider } from '@backstage/test-utils';
import {
  configApiRef,
  discoveryApiRef,
  errorApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';

import { CoderProvider } from './CoderProvider';
import { useCoderAppConfig } from './CoderAppConfigProvider';
import { type CoderAuth, useEndUserCoderAuth } from './CoderAuthProvider';

import {
  getMockConfigApi,
  getMockDiscoveryApi,
  getMockErrorApi,
  getMockIdentityApi,
  mockAppConfig,
  mockCoderAuthToken,
} from '../../testHelpers/mockBackstageData';
import {
  getMockQueryClient,
  renderHookAsCoderEntity,
} from '../../testHelpers/setup';
import { UrlSync, urlSyncApiRef } from '../../api/UrlSync';
import { CoderClient, coderClientApiRef } from '../../api/CoderClient';

describe(`${CoderProvider.name}`, () => {
  describe('AppConfig', () => {
    function renderUseAppConfig() {
      return renderHookAsCoderEntity(useCoderAppConfig, {
        authStatus: 'authenticated',
      });
    }

    test(`Context hook exposes the same config that the provider has`, async () => {
      const { result } = await renderUseAppConfig();
      expect(result.current).toBe(mockAppConfig);
    });

    test('Context value remains stable across re-renders if appConfig is defined outside', async () => {
      const { result, rerender } = await renderUseAppConfig();
      expect(result.current).toBe(mockAppConfig);

      for (let i = 0; i < 10; i++) {
        rerender();
        expect(result.current).toBe(mockAppConfig);
      }
    });
  });

  describe('Auth', () => {
    // Can't use the render helpers because they all assume that the auth isn't
    // core to the functionality. In this case, you do need to bring in the full
    // CoderProvider
    const renderUseCoderAuth = () => {
      const discoveryApi = getMockDiscoveryApi();
      const configApi = getMockConfigApi();
      const identityApi = getMockIdentityApi();

      const urlSync = new UrlSync({
        apis: { discoveryApi, configApi },
      });

      const coderClientApi = new CoderClient({
        apis: { urlSync, identityApi },
      });

      return renderHook(useEndUserCoderAuth, {
        wrapper: ({ children }) => (
          <TestApiProvider
            apis={[
              [errorApiRef, getMockErrorApi()],
              [identityApiRef, getMockIdentityApi()],
              [configApiRef, configApi],
              [discoveryApiRef, discoveryApi],

              [urlSyncApiRef, urlSync],
              [coderClientApiRef, coderClientApi],
            ]}
          >
            <CoderProvider
              appConfig={mockAppConfig}
              queryClient={getMockQueryClient()}
            >
              {children}
            </CoderProvider>
          </TestApiProvider>
        ),
      });
    };

    it('Should let the user eject their auth token', async () => {
      const { result } = renderUseCoderAuth();
      act(() => result.current.registerNewToken(mockCoderAuthToken));

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining<Partial<CoderAuth>>({
            status: 'authenticated',
            token: mockCoderAuthToken,
            error: undefined,
          }),
        );
      });

      act(() => result.current.ejectToken());

      expect(result.current).toEqual(
        expect.objectContaining<Partial<CoderAuth>>({
          status: 'tokenMissing',
          token: undefined,
        }),
      );
    });
  });
});
