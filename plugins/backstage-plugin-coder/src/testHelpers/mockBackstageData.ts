/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import { ConfigReader, FrontendHostDiscovery } from '@backstage/core-app-api';
import { MockConfigApi, MockErrorApi } from '@backstage/test-utils';
import type { ScmIntegrationRegistry } from '@backstage/integration';
/* eslint-enable @backstage/no-undeclared-imports */

import { useEntity } from '@backstage/plugin-catalog-react';
import {
  type CoderAppConfig,
  type CoderAuth,
  type CoderAuthStatus,
} from '../components/CoderProvider';
import {
  CoderWorkspacesConfig,
  type YamlConfig,
} from '../hooks/useCoderWorkspacesConfig';
import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
} from '@backstage/integration-react';
import {
  ApiRef,
  DiscoveryApi,
  IdentityApi,
  configApiRef,
  discoveryApiRef,
  errorApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import {
  CODER_PROXY_PREFIX,
  UrlSync,
  defaultUrlPrefixes,
  urlSyncApiRef,
} from '../api/UrlSync';

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
 * The API endpoint to use with the mock server during testing.
 *
 * The string literal expression is complicated, but hover over it to see what
 * the final result is.
 */
export const mockBackstageProxyEndpoint =
  `${mockBackstageUrlRoot}${defaultUrlPrefixes.proxyPrefix}${CODER_PROXY_PREFIX}${defaultUrlPrefixes.apiRoutePrefix}` as const;

/**
 * The assets endpoint to use during testing.
 *
 * The string literal expression is complicated, but hover over it to see what
 * the final result is.
 */
export const mockBackstageAssetsEndpoint =
  `${mockBackstageUrlRoot}${defaultUrlPrefixes.proxyPrefix}${CODER_PROXY_PREFIX}${defaultUrlPrefixes.assetsRoutePrefix}` as const;

export const mockBearerToken = 'This-is-an-opaque-value-by-design';
export const mockCoderAuthToken = 'ZG0HRy2gGN-mXljc1s5FqtE8WUJ4sUc5X';

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
  token: mockCoderAuthToken,
  error: undefined,
  tokenLoadedOnMount: true,
  isAuthenticated: true,
  registerNewToken: jest.fn(),
  ejectToken: jest.fn(),
} as const satisfies Partial<CoderAuth>;

const notAuthedState = {
  token: undefined,
  error: undefined,
  tokenLoadedOnMount: false,
  isAuthenticated: false,
  registerNewToken: jest.fn(),
  ejectToken: jest.fn(),
} as const satisfies Partial<CoderAuth>;

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
} as const satisfies Record<CoderAuthStatus, CoderAuth>;

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

export function getMockDiscoveryApi(): DiscoveryApi {
  return FrontendHostDiscovery.fromConfig(
    new ConfigReader({
      backend: {
        baseUrl: mockBackstageUrlRoot,
      },
    }),
  );
}

type ApiTuple = readonly [ApiRef<NonNullable<unknown>>, NonNullable<unknown>];

export function getMockApiList(): readonly ApiTuple[] {
  const mockErrorApi = getMockErrorApi();
  const mockSourceControl = getMockSourceControl();
  const mockConfigApi = getMockConfigApi();
  const mockIdentityApi = getMockIdentityApi();
  const mockDiscoveryApi = getMockDiscoveryApi();

  const mockUrlSyncApi = new UrlSync({
    apis: {
      discoveryApi: mockDiscoveryApi,
      configApi: mockConfigApi,
    },
  });

  return [
    // APIs that Backstage ships with normally
    [errorApiRef, mockErrorApi],
    [scmIntegrationsApiRef, mockSourceControl],
    [configApiRef, mockConfigApi],
    [identityApiRef, mockIdentityApi],
    [discoveryApiRef, mockDiscoveryApi],

    // Custom APIs specific to the Coder plugin
    [urlSyncApiRef, mockUrlSyncApi],
  ];
}
