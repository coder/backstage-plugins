import {
  CODER_AUTH_HEADER_KEY,
  CoderClient,
  disabledClientError,
} from './CoderClient';
import type { IdentityApi } from '@backstage/core-plugin-api';
import { UrlSync } from './UrlSync';
import { rest } from 'msw';
import { server } from '../testHelpers/server';
import {
  getMockConfigApi,
  getMockDiscoveryApi,
  getMockIdentityApi,
  mockCoderAuthToken,
  mockBackstageProxyEndpoint as root,
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
  describe('syncToken functionality', () => {
    it('Will load the provided token into the client if it is valid', async () => {
      const client = new CoderClient({ apis: getConstructorApis() });

      const syncResult = await client.syncToken(mockCoderAuthToken);
      expect(syncResult).toBe(true);

      let serverToken: string | null = null;
      server.use(
        rest.get(`${root}/users/me/login-type`, (req, res, ctx) => {
          serverToken = req.headers.get(CODER_AUTH_HEADER_KEY);
          return res(ctx.status(200));
        }),
      );

      await client.sdk.getUserLoginType();
      expect(serverToken).toBe(mockCoderAuthToken);
    });

    it('Will NOT load the provided token into the client if it is invalid', async () => {
      const client = new CoderClient({ apis: getConstructorApis() });

      const syncResult = await client.syncToken('Definitely not valid');
      expect(syncResult).toBe(false);

      let serverToken: string | null = null;
      server.use(
        rest.get(`${root}/users/me/login-type`, (req, res, ctx) => {
          serverToken = req.headers.get(CODER_AUTH_HEADER_KEY);
          return res(ctx.status(200));
        }),
      );

      await client.sdk.getUserLoginType();
      expect(serverToken).toBe(null);
    });

    it.only('Will propagate any other error types to the caller', async () => {
      expect.hasAssertions();
    });
  });

  describe('cleanupClient functionality', () => {
    it('Will prevent any new SDK requests from going through', async () => {
      const client = new CoderClient({ apis: getConstructorApis() });
      client.cleanupClient();

      // Request should fail, even though token is valid
      await expect(() => {
        return client.syncToken(mockCoderAuthToken);
      }).rejects.toThrow(disabledClientError);

      await expect(() => {
        return client.sdk.getWorkspaces({
          q: 'owner:me',
          limit: 0,
        });
      }).rejects.toThrow(disabledClientError);
    });

    it('Will abort any pending requests', async () => {
      expect.hasAssertions();
    });
  });

  // Eventually the Coder SDK is going to get too big to test every single
  // function. Focus tests on the functionality specifically being patched in
  // for Backstage
  describe('Coder SDK', () => {
    it('Will remap all workspace icon URLs to use the proxy URL if necessary', async () => {
      expect.hasAssertions();
    });

    it('Lets the user search for workspaces by repo URL', async () => {
      expect.hasAssertions();
    });
  });
});
