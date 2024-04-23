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
import {
  type CoderTokenUiAuth,
  useCoderTokenAuth,
} from '../../hooks/useCoderTokenAuth';

import {
  getMockConfigApi,
  getMockDiscoveryApi,
  getMockErrorApi,
  getMockIdentityApi,
  mockAppConfig,
  mockCoderAuthToken,
  setupCoderClient,
} from '../../testHelpers/mockBackstageData';
import {
  getMockQueryClient,
  renderHookAsCoderEntity,
} from '../../testHelpers/setup';
import { coderAuthApiRef } from '../../api/Auth';
import { coderClientApiRef } from '../../api/CoderClient';

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
    // core to the functionality and can be hand-waved. In this case, you do
    // need to bring in the full CoderProvider to verify it's working
    const renderUseCoderAuth = async () => {
      const identityApi = getMockIdentityApi();
      const discoveryApi = getMockDiscoveryApi();

      const { authApi, coderClientApi } = setupCoderClient({
        discoveryApi,
        identityApi,
      });

      const renderResult = renderHook(useCoderTokenAuth, {
        wrapper: ({ children }) => (
          <TestApiProvider
            apis={[
              [errorApiRef, getMockErrorApi()],
              [identityApiRef, getMockIdentityApi()],
              [configApiRef, getMockConfigApi()],
              [discoveryApiRef, discoveryApi],
              [coderAuthApiRef, authApi],
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

      await waitFor(() => expect(renderResult.result.current).not.toBe(null));
      return renderResult;
    };

    it('Should let the user eject their auth token', async () => {
      const { result } = await renderUseCoderAuth();
      act(() => result.current.registerNewToken(mockCoderAuthToken));

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining<Partial<CoderTokenUiAuth>>({
            status: 'authenticated',
            token: mockCoderAuthToken,
            error: undefined,
          }),
        );
      });

      act(() => result.current.ejectToken());

      expect(result.current).toEqual(
        expect.objectContaining<Partial<CoderTokenUiAuth>>({
          status: 'tokenMissing',
          token: undefined,
        }),
      );
    });
  });
});
