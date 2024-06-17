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
import { type CoderAuth, useInternalCoderAuth } from './CoderAuthProvider';

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
import {
  CoderClientWrapper,
  coderClientWrapperApiRef,
} from '../../api/CoderClient';

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
    // CoderProvider to make sure that it's working properly
    const renderUseCoderAuth = () => {
      const discoveryApi = getMockDiscoveryApi();
      const configApi = getMockConfigApi();
      const identityApi = getMockIdentityApi();

      const urlSync = new UrlSync({
        apis: { discoveryApi, configApi },
      });

      const coderClientApi = new CoderClientWrapper({
        apis: { urlSync, identityApi },
      });

      return renderHook(useInternalCoderAuth, {
        wrapper: ({ children }) => (
          <TestApiProvider
            apis={[
              [errorApiRef, getMockErrorApi()],
              [identityApiRef, getMockIdentityApi()],
              [configApiRef, configApi],
              [discoveryApiRef, discoveryApi],

              [urlSyncApiRef, urlSync],
              [coderClientWrapperApiRef, coderClientApi],
            ]}
          >
            <CoderProvider
              appConfig={mockAppConfig}
              queryClient={getMockQueryClient()}
              fallbackAuthUiMode="restrained"
            >
              {children}
            </CoderProvider>
          </TestApiProvider>
        ),
      });
    };

    it('Should let the user unlink their auth token', async () => {
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

      act(() => result.current.unlinkToken());

      expect(result.current).toEqual(
        expect.objectContaining<Partial<CoderAuth>>({
          status: 'tokenMissing',
          token: undefined,
        }),
      );
    });
  });
});
