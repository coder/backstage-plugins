/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import { ConfigReader } from '@backstage/core-app-api';
import { MockConfigApi, MockErrorApi } from '@backstage/test-utils';
/* eslint-enable @backstage/no-undeclared-imports */

import { useEntity } from '@backstage/plugin-catalog-react';
import {
  CoderWorkspaceConfig,
  type CoderAppConfig,
  CoderAuth,
  CoderAuthStatus,
} from '../components/CoderProvider';
import {
  CoderEntityConfig,
  type YamlConfig,
} from '../hooks/useCoderEntityConfig';
import { ScmIntegrationsApi } from '@backstage/integration-react';

import { API_ROUTE_PREFIX, ASSETS_ROUTE_PREFIX } from '../api';

/**
 * This is the key that Backstage checks from the entity data to determine the
 * repo URL of the current page. This is not guaranteed to be stable, and can
 * change over time. Do not export this without good reason.
 */
const ANNOTATION_SOURCE_LOCATION_KEY = 'backstage.io/source-location';

/**
 * The URL that will be exposed via useCoderEntityConfig. This value must have
 * all additional parts at the end stripped off in order to make sure that the
 * Coder app is correctly able to download a repo for a workspace.
 */
export const cleanedRepoUrl = 'https://www.zombo.com';

/**
 * The shape of URL that Backstage will parse from the entity data by default
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
export const mockBackstageProxyEndpoint = `${mockBackstageUrlRoot}${API_ROUTE_PREFIX}`;

export const mockBackstageAssetsEndpoint = `${mockBackstageUrlRoot}${ASSETS_ROUTE_PREFIX}`;

export const mockCoderAuthToken = 'ZG0HRy2gGN-mXljc1s5FqtE8WUJ4sUc5X';

export const mockYamlConfig = {
  templateName: 'cool-coder-template',
  mode: 'auto',
  params: {
    region: 'brazil',
  } as NonNullable<YamlConfig>['params'],
} as const satisfies YamlConfig;

export type BackstageEntity = ReturnType<typeof useEntity>['entity'];

export const mockEntity: BackstageEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'metadata',
    annotations: {
      [ANNOTATION_SOURCE_LOCATION_KEY]: `url:${cleanedRepoUrl}`,
    },
  },
  spec: {
    coder: mockYamlConfig,
  },
};

export const mockWorkspaceConfig: CoderWorkspaceConfig = {
  templateName: 'devcontainers',
  mode: 'manual',
  repoUrlParamKeys: ['custom_repo', 'repo_url'],
  params: {
    repo: 'custom',
    region: 'eu-helsinki',
  },
};

export const mockCoderEntityConfig: CoderEntityConfig = {
  mode: 'manual',
  templateName: 'mock-entity-config',
  repoUrlParamKeys: ['custom_repo', 'repo_url'],
  repoUrl: cleanedRepoUrl,
  params: {
    repo: 'custom',
    region: 'eu-helsinki',
    custom_repo: cleanedRepoUrl,
    repo_url: cleanedRepoUrl,
  },
};

export const mockAppConfig = {
  deployment: {
    accessUrl: 'https://dev.coder.com',
  },

  workspaces: mockWorkspaceConfig,
} as const satisfies CoderAppConfig;

const authedState = {
  token: mockCoderAuthToken,
  error: undefined,
  isAuthenticated: true,
  registerNewToken: jest.fn(),
  ejectToken: jest.fn(),
} as const satisfies Partial<CoderAuth>;

const notAuthedState = {
  token: undefined,
  error: undefined,
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

  reauthenticating: {
    ...notAuthedState,
    status: 'reauthenticating',
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

/**
 * Exposes a mock ScmIntegrationRegistry to be used with scmIntegrationsApiRef
 * for mocking out code that relies on source code data.
 *
 * This is one of the few API-ref-based values that Backstage does not expose a
 * mock version of.
 */
export function getMockSourceControl() {
  return ScmIntegrationsApi.fromConfig(new ConfigReader({}));
}
