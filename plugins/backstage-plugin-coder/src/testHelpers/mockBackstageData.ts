/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import { ConfigReader, FrontendHostDiscovery } from '@backstage/core-app-api';
import { MockConfigApi, MockErrorApi } from '@backstage/test-utils';
import type { ScmIntegrationRegistry } from '@backstage/integration';
/* eslint-enable @backstage/no-undeclared-imports */

import { useEntity } from '@backstage/plugin-catalog-react';
import { type CoderAppConfig } from '../components/CoderProvider';
import {
  CoderWorkspacesConfig,
  type YamlConfig,
} from '../hooks/useCoderWorkspacesConfig';

import {
  CoderClient,
  coderClientApiRef,
  defaultCoderClientConfigOptions,
} from '../api/CoderClient';
import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
} from '@backstage/integration-react';
import type {
  CoderAuthUiStatus,
  CoderUiTokenAuth,
} from '../components/CoderProvider';
import {
  type IdentityApi,
  type ApiRef,
  configApiRef,
  DiscoveryApi,
  discoveryApiRef,
  errorApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { CoderAuthApi, coderAuthApiRef } from '../api/Auth';
import { CoderTokenAuth } from '../api/CoderTokenAuth';

/**
 * This is the key that Backstage checks from the entity data to determine the
 * repo URL of the current page. This is not guaranteed to be stable, and can
 * change over time. Do not export this without good reason.
 */
export const ANNOTATION_SOURCE_LOCATION_KEY = 'backstage.io/source-location';

/**
 * The name of the repo that should be made available in the majority of
 * situations
 */
export const mockRepoName = 'zombocom';

/**
 * The URL that will be exposed via useCoderWorkspacesConfig. This value must
 * have all additional parts at the end stripped off in order to make sure that
 * the Coder app is correctly able to download a repo for a workspace.
 */
export const cleanedRepoUrl = `https://www.github.com/zombocom/${mockRepoName}`;

/**
 * The shape of URL that Backstage will parse from the entity data by default
 * Pattern shared by the Source Control Managers
 */
export const rawRepoUrl = `${cleanedRepoUrl}/tree/main/`;

/**
 * Where Backstage will "host" the backend during testing.
 */
export const mockBackstageUrlRoot = 'http://localhost:7007';

/**
 * The actual endpoint to hit when trying to mock out a server request during
 * testing.
 */
export const mockBackstageProxyEndpoint =
  `${mockBackstageUrlRoot}/api/proxy${defaultCoderClientConfigOptions.proxyPrefix}${defaultCoderClientConfigOptions.apiRoutePrefix}` as const;

export const mockBackstageAssetsEndpoint =
  `${mockBackstageUrlRoot}/api/proxy${defaultCoderClientConfigOptions.assetsRoutePrefix}` as const;

export const mockBearerToken = 'This-is-an-opaque-value-by-design';
export const mockCoderAuthToken = 'ZG0HRy2gGN-mXljc1s5FqtE8WUJ4sUc5X';
export const mockCoderAuthTokenHash = 6_410_025_509_154_725;

export const mockYamlConfig = {
  templateName: 'cool-coder-template',
  mode: 'auto',
  params: {
    region: 'brazil',
  } satisfies NonNullable<YamlConfig>['params'],
} as const satisfies YamlConfig;

export type BackstageEntity = ReturnType<typeof useEntity>['entity'];

export const mockEntity: BackstageEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'metadata',
    annotations: {
      [ANNOTATION_SOURCE_LOCATION_KEY]: `url:${rawRepoUrl}`,
    },
  },
  spec: {
    coder: mockYamlConfig,
  },
};

export const mockAppConfig = {
  deployment: {
    accessUrl: 'https://dev.coder.com',
  },

  workspaces: {
    defaultTemplateName: 'devcontainers',
    defaultMode: 'manual',
    repoUrlParamKeys: ['custom_repo', 'repo_url'],
    params: {
      repo: 'custom',
      region: 'eu-helsinki',
    },
  },
} as const satisfies CoderAppConfig;

export const mockCoderWorkspacesConfig = (() => {
  const urlParams = new URLSearchParams({
    mode: mockYamlConfig.mode,
    'param.repo': mockAppConfig.workspaces.params.repo,
    'param.region': mockYamlConfig.params.region,
    'param.custom_repo': cleanedRepoUrl,
    'param.repo_url': cleanedRepoUrl,
  });

  return {
    mode: 'auto',
    isReadingEntityData: true,
    templateName: mockYamlConfig.templateName,
    repoUrlParamKeys: ['custom_repo', 'repo_url'],
    repoUrl: cleanedRepoUrl,

    creationUrl: `${mockAppConfig.deployment.accessUrl}/templates/${
      mockYamlConfig.templateName
    }/workspace?${urlParams.toString()}`,

    params: {
      repo: 'custom',
      region: 'eu-helsinki',
      custom_repo: cleanedRepoUrl,
      repo_url: cleanedRepoUrl,
    },
  } as const satisfies CoderWorkspacesConfig;
})();

const authedState = {
  type: 'token',
  isAuthenticated: true,
  error: undefined,
  registerNewToken: jest.fn(),
  ejectToken: jest.fn(),
} as const satisfies Partial<CoderUiTokenAuth>;

const notAuthedState = {
  type: 'token',
  error: undefined,
  isAuthenticated: false,
  registerNewToken: jest.fn(),
  ejectToken: jest.fn(),
} as const satisfies Partial<CoderUiTokenAuth>;

export const mockAuthStates = {
  authenticated: {
    ...authedState,
    status: 'authenticated',
  },

  distrustedWithGracePeriod: {
    ...authedState,
    status: 'distrustedWithGracePeriod',
  },

  invalid: {
    ...notAuthedState,
    status: 'invalid',
  },

  authenticating: {
    ...notAuthedState,
    status: 'authenticating',
  },

  distrusted: {
    ...notAuthedState,
    status: 'distrusted',
  },

  initializing: {
    ...notAuthedState,
    status: 'initializing',
  },

  noInternetConnection: {
    ...notAuthedState,
    status: 'noInternetConnection',
  },

  tokenMissing: {
    ...notAuthedState,
    status: 'tokenMissing',
  },

  deploymentUnavailable: {
    ...notAuthedState,
    status: 'deploymentUnavailable',
  },
} as const satisfies Record<CoderAuthUiStatus, CoderUiTokenAuth>;

export function getMockConfigApi() {
  return new MockConfigApi({
    backend: {
      baseUrl: mockBackstageUrlRoot,
    },
  });
}

export function getMockErrorApi() {
  const errorApi = new MockErrorApi({ collect: true });
  errorApi.post = jest.fn(errorApi.post);
  return errorApi;
}

export function getMockIdentityApi(): IdentityApi {
  return {
    signOut: async () => {
      return void 'Not going to implement this';
    },
    getProfileInfo: async () => {
      return {
        displayName: 'Dobah',
        email: 'i-love-my-dog-dobah@dog.ceo',
        picture: undefined,
      };
    },
    getBackstageIdentity: async () => {
      return {
        type: 'user',
        userEntityRef: 'User:default/Dobah',
        ownershipEntityRefs: [],
      };
    },
    getCredentials: async () => {
      return {
        token: mockBearerToken,
      };
    },
  };
}

/**
 * Exposes a mock ScmIntegrationRegistry to be used with scmIntegrationsApiRef
 * for mocking out code that relies on source code data.
 *
 * This is one of the few API-ref-based values that Backstage does not expose a
 * mock version of.
 */
export function getMockSourceControl(): ScmIntegrationRegistry {
  return ScmIntegrationsApi.fromConfig(new ConfigReader({}));
}

export function getMockLocalStorage(
  initialData: Record<string, string> = {},
): Storage {
  let dataStore: Map<string, string | undefined> = new Map(
    Object.entries(initialData),
  );

  return {
    get length() {
      return dataStore.size;
    },

    getItem: key => {
      if (!dataStore.has(key)) {
        return null;
      }

      return dataStore.get(key) ?? null;
    },

    setItem: (key, value) => {
      dataStore.set(key, value);
    },

    removeItem: key => {
      dataStore.delete(key);
    },

    clear: () => {
      dataStore = new Map();
    },

    key: keyIndex => {
      const keys = [...dataStore.keys()];
      return keys[keyIndex] ?? null;
    },
  };
}

export function getMockDiscoveryApi(): DiscoveryApi {
  return FrontendHostDiscovery.fromConfig(
    new ConfigReader({
      backend: {
        baseUrl: mockBackstageUrlRoot,
      },
    }),
  );
}

export function getMockCoderTokenAuth(): CoderTokenAuth {
  return new CoderTokenAuth({
    localStorage: getMockLocalStorage(),
  });
}

type SetupCoderClientInputs = Readonly<{
  discoveryApi?: DiscoveryApi;
  identityApi?: IdentityApi;
  authApi?: CoderAuthApi;
}>;

type SetupCoderClientResult = Readonly<{
  authApi: CoderAuthApi;
  coderClientApi: CoderClient;
}>;

/**
 * @todo 2024-04-23 - This is a workaround for making sure that the Axios
 * instance doesn't get overloaded with different request interceptors from each
 * test case.
 *
 * The SDK value we'll eventually be grabbing (and its Axios instance) are
 * basically set up as a global singleton, which means that you get less ability
 * to do test isolation. Better to make the updates upstream so that the SDK
 * can be re-instantiated for different tests, and then have the garbage
 * collector handle disposing all of the values.
 */
const activeClients = new Set<CoderClient>();
afterEach(() => {
  activeClients.forEach(client => client.cleanupClient());
  activeClients.clear();
});

/**
 * Gives back a Coder Client, its underlying auth implementation, and also
 * handles cleanup for the Coder client between test runs.
 *
 * It is strongly recommended that you create all Coder clients via this
 * function.
 */
export function setupCoderClient({
  authApi = getMockCoderTokenAuth(),
  discoveryApi = getMockDiscoveryApi(),
  identityApi = getMockIdentityApi(),
}: SetupCoderClientInputs): SetupCoderClientResult {
  const mockCoderClientApi = new CoderClient({
    apis: { identityApi, discoveryApi, authApi },
  });

  activeClients.add(mockCoderClientApi);

  return {
    authApi,
    coderClientApi: mockCoderClientApi,
  };
}

type ApiTuple = readonly [ApiRef<NonNullable<unknown>>, NonNullable<unknown>];

type GetMockApiListInputs = Readonly<{
  autoValidate?: boolean;
}>;

/**
 * Creates a list of mock Backstage API definitions that can be fed directly
 * into some of the official Backstage test helpers.
 *
 * When trying to set up dependency injection for a Backstage test, this is the
 * main test helper you should be using 99% of the time.
 */
export function getMockApiList(
  inputs?: GetMockApiListInputs,
): readonly ApiTuple[] {
  const { autoValidate = true } = inputs ?? {};

  const mockErrorApi = getMockErrorApi();
  const mockSourceControl = getMockSourceControl();
  const mockConfigApi = getMockConfigApi();
  const mockIdentityApi = getMockIdentityApi();
  const mockDiscoveryApi = getMockDiscoveryApi();

  const authApi = new CoderTokenAuth();
  authApi.registerNewToken(mockCoderAuthToken);

  const { coderClientApi } = setupCoderClient({
    authApi,
    discoveryApi: mockDiscoveryApi,
    identityApi: mockIdentityApi,
  });

  if (autoValidate) {
    void coderClientApi.validateAuth();
  }

  return [
    // APIs that Backstage ships with normally
    [errorApiRef, mockErrorApi],
    [scmIntegrationsApiRef, mockSourceControl],
    [configApiRef, mockConfigApi],
    [identityApiRef, mockIdentityApi],
    [discoveryApiRef, mockDiscoveryApi],

    // Custom, Coder-specific APIs
    [coderAuthApiRef, authApi],
    [coderClientApiRef, coderClientApi],
  ];
}
