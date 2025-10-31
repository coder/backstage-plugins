/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';
import {
  type RenderHookOptions,
  type RenderHookResult,
  renderHook,
  waitFor,
  render,
  RenderResult,
} from '@testing-library/react';
/* eslint-enable @backstage/no-undeclared-imports */

import type { ReactElement, ReactNode } from 'react';
import {
  type QueryClientConfig,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import {
  type CoderAuth,
  type CoderAuthStatus,
  type CoderAppConfig,
  type CoderProviderProps,
  AuthStateContext,
  AuthTrackingContext,
  CoderAppConfigProvider,
  dummyTrackComponent,
} from '../components/CoderProvider';
import {
  mockAppConfig,
  mockEntity,
  mockAuthStates,
  type BackstageEntity,
  getMockApiList,
} from './mockBackstageData';
import { CoderErrorBoundary } from '../plugin';

const initialAbortSignalTimeout = AbortSignal.timeout;
beforeAll(() => {
  if (!AbortSignal.timeout) {
    AbortSignal.timeout = ms => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('TimeoutError')), ms);
      return controller.signal;
    };
  }
});

afterAll(() => {
  AbortSignal.timeout = initialAbortSignalTimeout;
});

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

export function getMockQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...(config ?? {}),
    defaultOptions: {
      ...(config?.defaultOptions ?? {}),
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        networkMode: 'offlineFirst',
        ...(config?.defaultOptions?.queries ?? {}),
      },
    },
  });
}

type MockAuthProps = Readonly<
  Omit<CoderProviderProps, 'fallbackAuthUiMode'> & {
    auth?: CoderAuth;

    /**
     * Shortcut property for injecting an auth object. Can conflict with the
     * auth property; if both are defined, authStatus is completely ignored
     */
    authStatus?: CoderAuthStatus;
  }
>;

export const CoderProviderWithMockAuth = ({
  children,
  appConfig,
  auth,
  queryClient = getMockQueryClient(),
  authStatus = 'authenticated',
}: MockAuthProps) => {
  const activeAuth = auth ?? mockAuthStates[authStatus];

  return (
    <CoderErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CoderAppConfigProvider appConfig={appConfig}>
          <AuthTrackingContext.Provider value={dummyTrackComponent}>
            <AuthStateContext.Provider value={activeAuth}>
              {children}
            </AuthStateContext.Provider>
          </AuthTrackingContext.Provider>
        </CoderAppConfigProvider>
      </QueryClientProvider>
    </CoderErrorBoundary>
  );
};

type RenderHookAsCoderEntityOptions<TProps extends NonNullable<unknown>> = Omit<
  RenderHookOptions<TProps>,
  'wrapper'
> & {
  authStatus?: CoderAuthStatus;
};

export const renderHookAsCoderEntity = async <
  TReturn = unknown,
  TProps extends NonNullable<unknown> = NonNullable<unknown>,
>(
  hook: (props: TProps) => TReturn,
  options?: RenderHookAsCoderEntityOptions<TProps>,
): Promise<RenderHookResult<TReturn, TProps>> => {
  const { authStatus, ...delegatedOptions } = options ?? {};
  const mockQueryClient = getMockQueryClient();

  const renderHookValue = renderHook(hook, {
    ...delegatedOptions,
    wrapper: ({ children }) => {
      const mainMarkup = (
        <TestApiProvider apis={getMockApiList()}>
          <CoderProviderWithMockAuth
            appConfig={mockAppConfig}
            queryClient={mockQueryClient}
            authStatus={authStatus}
          >
            <EntityProvider entity={mockEntity}>
              <>{children}</>
            </EntityProvider>
          </CoderProviderWithMockAuth>
        </TestApiProvider>
      );

      return wrapInTestApp(mainMarkup) as unknown as typeof mainMarkup;
    },
  });

  await waitFor(() => expect(renderHookValue.result.current).not.toBe(null));
  return renderHookValue;
};

type RenderInCoderEnvironmentInputs = Readonly<{
  children: ReactNode;
  entity?: BackstageEntity;
  appConfig?: CoderAppConfig;
  queryClient?: QueryClient;
  auth?: CoderAuth;
}>;

export async function renderInCoderEnvironment({
  children,
  auth,
  entity = mockEntity,
  queryClient = getMockQueryClient(),
  appConfig = mockAppConfig,
}: RenderInCoderEnvironmentInputs): Promise<RenderResult> {
  const apiList = getMockApiList();
  const addDependencies = (node: ReactNode): ReactElement => {
    return wrapInTestApp(
      <TestApiProvider apis={apiList}>
        <EntityProvider entity={entity}>
          <CoderProviderWithMockAuth
            appConfig={appConfig}
            auth={auth}
            queryClient={queryClient}
          >
            {node}
          </CoderProviderWithMockAuth>
        </EntityProvider>
      </TestApiProvider>,
    );
  };

  const { rerender, ...renderHelpers } = render(addDependencies(children));
  const loadingIndicator = renderHelpers.container.querySelector(
    'div[data-testid="progress"]',
  );

  await waitFor(() => expect(loadingIndicator).not.toBeInTheDocument());

  return {
    ...renderHelpers,
    rerender: newChildren => {
      rerender(addDependencies(newChildren));
    },
  };
}

type InvertedPromiseResult<TData = unknown, TError = Error> = Readonly<{
  promise: Promise<TData>;
  resolve: (value: TData) => void;
  reject: (errorReason: TError) => void;
}>;

export function createInvertedPromise<
  TData = unknown,
  TError = Error,
>(): InvertedPromiseResult<TData, TError> {
  let resolve!: (value: TData) => void;
  let reject!: (error: TError) => void;

  const promise = new Promise<TData>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}
