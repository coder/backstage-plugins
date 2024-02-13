/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import { render } from '@testing-library/react';
import { MockErrorApi, TestApiProvider } from '@backstage/test-utils';
import {
  RenderHookOptions,
  RenderHookResult,
  renderHook,
} from '@testing-library/react-hooks';
/* eslint-enable @backstage/no-undeclared-imports */

import React, { ReactElement, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { scmIntegrationsApiRef } from '@backstage/integration-react';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { configApiRef, errorApiRef } from '@backstage/core-plugin-api';

import {
  type CoderProviderProps,
  AuthContext,
  CoderAppConfigProvider,
  CoderAuthStatus,
} from '../components/CoderProvider';
import {
  getMockSourceControl,
  mockAppConfig,
  mockEntity,
  getMockErrorApi,
  getMockConfigApi,
  mockAuthStates,
} from './mockBackstageData';

import { CoderErrorBoundary } from '../plugin';

const afterEachCleanupFunctions: (() => void)[] = [];

export function cleanUpAfterEachHelpers() {
  afterEachCleanupFunctions.forEach(fn => fn());
}

/**
 * Use this to suppress expected error messages from deliberately trying to
 * break error boundary components.
 *
 * Call this with beforeEach during testing; calling afterEach is not necessary
 */
export function suppressErrorBoundaryWarnings(): void {
  /* eslint-disable-next-line no-console --
     Have to do this for any tests involving error boundaries. Because the
     errors happen through React and can't be caught with expect.toThrow or
     try/catch, there's no direct way to suppress expected error warnings.
  */
  const logError = console.error;
  const reactWarningStringRe =
    /^The above error occurred in the <\w+> component:/;

  const augmentedConsoleError = jest
    .spyOn(console, 'error')
    .mockImplementation((...args: readonly unknown[]) => {
      const firstArg = args[0];

      const isReactWarningString =
        typeof firstArg === 'string' && reactWarningStringRe.test(firstArg);

      const isReactErrorInfoObject =
        typeof firstArg === 'object' &&
        firstArg !== null &&
        'detail' in firstArg &&
        'type' in firstArg;

      const safeToSupressWarning =
        args.length === 1 && (isReactWarningString || isReactErrorInfoObject);

      if (!safeToSupressWarning) {
        logError(...args);
      }
    });

  afterEachCleanupFunctions.push(() => augmentedConsoleError.mockClear());
}

export function getMockQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        networkMode: 'offlineFirst',
      },
    },
  });
}

type MockAuthProps = Readonly<
  Required<CoderProviderProps> & {
    authStatus?: CoderAuthStatus;
  }
>;

export const CoderProviderWithMockAuth = ({
  children,
  queryClient,
  appConfig,
  authStatus = 'authenticated',
}: MockAuthProps) => {
  return (
    <CoderErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CoderAppConfigProvider appConfig={appConfig}>
          <AuthContext.Provider value={mockAuthStates[authStatus]}>
            {children}
          </AuthContext.Provider>
        </CoderAppConfigProvider>
      </QueryClientProvider>
    </CoderErrorBoundary>
  );
};

type ChildProps = Readonly<PropsWithChildren<unknown>>;
type RenderResultWithErrorApi = ReturnType<typeof render> & {
  errorApi: MockErrorApi;
};

export const renderWithEntity = ({ children }: ChildProps) => {
  const mockSourceControlApi = getMockSourceControl();
  const mockConfigApi = getMockConfigApi();

  return render(
    <TestApiProvider
      apis={[
        [scmIntegrationsApiRef, mockSourceControlApi],
        [configApiRef, mockConfigApi],
      ]}
    >
      <EntityProvider entity={mockEntity}>{children}</EntityProvider>
    </TestApiProvider>,
  );
};

export const renderWithCoderProvider = (
  component: ReactElement,
): RenderResultWithErrorApi => {
  const errorApi = getMockErrorApi();
  const mockQueryClient = getMockQueryClient();

  const result = render(
    <TestApiProvider apis={[[errorApiRef, errorApi]]}>
      <CoderProviderWithMockAuth
        appConfig={mockAppConfig}
        queryClient={mockQueryClient}
        authStatus="authenticated"
      >
        {component}
      </CoderProviderWithMockAuth>
    </TestApiProvider>,
  );

  return { ...result, errorApi };
};

export const renderWithCoderEntity = ({
  children,
}: ChildProps): RenderResultWithErrorApi => {
  const mockErrorApi = getMockErrorApi();
  const mockSourceControl = getMockSourceControl();
  const mockConfigApi = getMockConfigApi();
  const mockQueryClient = getMockQueryClient();

  const result = render(
    <TestApiProvider
      apis={[
        [errorApiRef, mockErrorApi],
        [scmIntegrationsApiRef, mockSourceControl],
        [configApiRef, mockConfigApi],
      ]}
    >
      <CoderProviderWithMockAuth
        appConfig={mockAppConfig}
        queryClient={mockQueryClient}
      >
        <EntityProvider entity={mockEntity}>{children}</EntityProvider>
      </CoderProviderWithMockAuth>
    </TestApiProvider>,
  );

  return { ...result, errorApi: mockErrorApi };
};

type RenderHookAsCoderEntityOptions<TProps extends NonNullable<unknown>> = Omit<
  RenderHookOptions<TProps>,
  'wrapper'
> & {
  authStatus?: CoderAuthStatus;
};

export const renderHookAsCoderEntity = <
  TProps extends NonNullable<unknown> = NonNullable<unknown>,
  TReturn = unknown,
>(
  hook: (props: TProps) => TReturn,
  options?: RenderHookAsCoderEntityOptions<TProps>,
): RenderHookResult<TProps, TReturn> => {
  const { authStatus, ...delegatedOptions } = options ?? {};
  const mockErrorApi = getMockErrorApi();
  const mockSourceControl = getMockSourceControl();
  const mockConfigApi = getMockConfigApi();
  const mockQueryClient = getMockQueryClient();

  return renderHook(hook, {
    ...delegatedOptions,
    wrapper: ({ children }) => (
      <TestApiProvider
        apis={[
          [errorApiRef, mockErrorApi],
          [scmIntegrationsApiRef, mockSourceControl],
          [configApiRef, mockConfigApi],
        ]}
      >
        <CoderProviderWithMockAuth
          appConfig={mockAppConfig}
          queryClient={mockQueryClient}
          authStatus={authStatus}
        >
          <EntityProvider entity={mockEntity}>{children}</EntityProvider>
        </CoderProviderWithMockAuth>
      </TestApiProvider>
    ),
  });
};
