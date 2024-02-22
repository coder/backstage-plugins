import React, { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { act, waitFor } from '@testing-library/react';

import { TestApiProvider } from '@backstage/test-utils';
import { configApiRef, errorApiRef } from '@backstage/core-plugin-api';

import { CoderProvider } from './CoderProvider';
import { useCoderAppConfig } from './CoderAppConfigProvider';
import { type CoderAuth, useCoderAuth } from './CoderAuthProvider';

import {
  getMockConfigApi,
  getMockErrorApi,
  mockAppConfig,
  mockCoderAuthToken,
} from '../../testHelpers/mockBackstageData';
import {
  getMockQueryClient,
  renderHookAsCoderEntity,
} from '../../testHelpers/setup';

describe(`${CoderProvider.name}`, () => {
  describe('AppConfig', () => {
    function renderUseAppConfig() {
      return renderHookAsCoderEntity(useCoderAppConfig, {
        authStatus: 'authenticated',
      });
    }

    test(`Context hook exposes the same config that the provider has`, () => {
      const { result } = renderUseAppConfig();
      expect(result.current).toBe(mockAppConfig);
    });

    test('Context value remains stable across re-renders if appConfig is defined outside', () => {
      const { result, rerender } = renderUseAppConfig();
      expect(result.current).toBe(mockAppConfig);

      for (let i = 0; i < 10; i++) {
        rerender();
        expect(result.current).toBe(mockAppConfig);
      }
    });

    // Our documentation pushes people to define the config outside a component,
    // just to stabilize the memory reference for the value, and make sure that
    // memoization caches don't get invalidated too often. This test is just a
    // safety net to catch what happens if someone forgets
    test('Context value will change by reference on re-render if defined inline inside a parent', () => {
      const ParentComponent = ({ children }: PropsWithChildren<unknown>) => {
        const configThatChangesEachRender = { ...mockAppConfig };

        return (
          <TestApiProvider
            apis={[
              [errorApiRef, getMockErrorApi()],
              [configApiRef, getMockConfigApi()],
            ]}
          >
            <CoderProvider appConfig={configThatChangesEachRender}>
              {children}
            </CoderProvider>
          </TestApiProvider>
        );
      };

      const { result, rerender } = renderHook(useCoderAppConfig, {
        wrapper: ParentComponent,
      });

      const firstResult = result.current;
      rerender();

      expect(result.current).not.toBe(firstResult);
      expect(result.current).toEqual(firstResult);
    });
  });

  describe('Auth', () => {
    // Can't use the render helpers because they all assume that the auth isn't
    // core to the functionality. In this case, you do need to bring in the full
    // CoderProvider
    const renderUseCoderAuth = () => {
      return renderHook(useCoderAuth, {
        wrapper: ({ children }) => (
          <TestApiProvider
            apis={[
              [errorApiRef, getMockErrorApi()],
              [configApiRef, getMockConfigApi()],
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
