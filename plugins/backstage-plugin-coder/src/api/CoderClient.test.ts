import { CoderClient, disabledClientError } from './CoderClient';
import type { IdentityApi } from '@backstage/core-plugin-api';
import { UrlSync } from './UrlSync';
import {
  getMockConfigApi,
  getMockDiscoveryApi,
  getMockIdentityApi,
  mockCoderAuthToken,
} from '../testHelpers/mockBackstageData';

type ConstructorApis = Readonly<{
  identityApi: IdentityApi;
  urlSync: UrlSync;
}>;

function getConstructorApis(): ConstructorApis {
  const configApi = getMockConfigApi();
  const discoveryApi = getMockDiscoveryApi();
  const urlSync = new UrlSync({
    apis: { configApi, discoveryApi },
  });

  const identityApi = getMockIdentityApi();
  return { urlSync, identityApi };
}

describe(`${CoderClient.name}`, () => {
  describe('syncToken functionality', () => {});

  describe('cleanupClient functionality', () => {
    it('Will prevent any new SDK requests from going through', async () => {
      const client = new CoderClient({ apis: getConstructorApis() });
      client.cleanupClient();

      // Request should fail, even though token is valid
      await expect(() => client.syncToken(mockCoderAuthToken)).rejects.toThrow(
        disabledClientError,
      );

      await expect(() => {
        return client.sdk.getWorkspaces({
          q: 'owner:me',
          limit: 0,
        });
      }).rejects.toThrow(disabledClientError);
    });
  });

  describe('Making fetch requests in general', () => {});

  describe('Coder SDK', () => {});
});
