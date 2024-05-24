import { CODER_AUTH_HEADER_KEY, CoderClient } from './CoderClient';
import type { IdentityApi } from '@backstage/core-plugin-api';
import { UrlSync } from './UrlSync';
import { rest } from 'msw';
import { mockServerEndpoints, server, wrappedGet } from '../testHelpers/server';
import { CanceledError } from 'axios';
import { delay } from '../utils/time';
import {
  mockWorkspacesList,
  mockWorkspacesListForRepoSearch,
} from '../testHelpers/mockCoderPluginData';
import type { Workspace, WorkspacesResponse } from './vendoredSdk';
import {
  getMockConfigApi,
  getMockDiscoveryApi,
  getMockIdentityApi,
  mockCoderAuthToken,
  mockCoderWorkspacesConfig,
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
        rest.get(mockServerEndpoints.authenticatedUser, (req, res, ctx) => {
          serverToken = req.headers.get(CODER_AUTH_HEADER_KEY);
          return res(ctx.status(200));
        }),
      );

      await client.sdk.getAuthenticatedUser();
      expect(serverToken).toBe(mockCoderAuthToken);
    });

    it('Will NOT load the provided token into the client if it is invalid', async () => {
      const client = new CoderClient({ apis: getConstructorApis() });

      const syncResult = await client.syncToken('Definitely not valid');
      expect(syncResult).toBe(false);

      let serverToken: string | null = null;
      server.use(
        rest.get(mockServerEndpoints.authenticatedUser, (req, res, ctx) => {
          serverToken = req.headers.get(CODER_AUTH_HEADER_KEY);
          return res(ctx.status(200));
        }),
      );

      await client.sdk.getAuthenticatedUser();
      expect(serverToken).toBe(null);
    });

    it('Will propagate any other error types to the caller', async () => {
      const client = new CoderClient({
        // Setting the timeout to 0 will make requests instantly fail from the
        // next microtask queue tick
        requestTimeoutMs: 0,
        apis: getConstructorApis(),
      });

      server.use(
        rest.get(mockServerEndpoints.authenticatedUser, async (_, res, ctx) => {
          // MSW is so fast that sometimes it can respond before a forced
          // timeout; have to introduce artificial delay (that shouldn't matter
          // as long as the abort logic goes through properly)
          await delay(2_000);
          return res(ctx.status(200));
        }),
      );

      await expect(() => {
        return client.syncToken(mockCoderAuthToken);
      }).rejects.toThrow(CanceledError);
    });
  });

  // Eventually the Coder SDK is going to get too big to test every single
  // function. Focus tests on the functionality specifically being patched in
  // for Backstage
  describe('Coder SDK', () => {
    it('Will remap all workspace icon URLs to use the proxy URL if necessary', async () => {
      const apis = getConstructorApis();
      const client = new CoderClient({
        apis,
        initialToken: mockCoderAuthToken,
      });

      server.use(
        wrappedGet(mockServerEndpoints.workspaces, (_, res, ctx) => {
          const withRelativePaths = mockWorkspacesList.map<Workspace>(ws => {
            return {
              ...ws,
              template_icon: '/emojis/blueberry.svg',
            };
          });

          return res(
            ctx.status(200),
            ctx.json<WorkspacesResponse>({
              workspaces: withRelativePaths,
              count: withRelativePaths.length,
            }),
          );
        }),
      );

      const { workspaces } = await client.sdk.getWorkspaces({
        q: 'owner:me',
        limit: 0,
      });

      const { urlSync } = apis;
      const apiEndpoint = await urlSync.getApiEndpoint();

      const allWorkspacesAreRemapped = !workspaces.some(ws =>
        ws.template_icon.startsWith(apiEndpoint),
      );

      expect(allWorkspacesAreRemapped).toBe(true);
    });

    it('Lets the user search for workspaces by repo URL', async () => {
      const client = new CoderClient({
        initialToken: mockCoderAuthToken,
        apis: getConstructorApis(),
      });

      const { workspaces } = await client.sdk.getWorkspacesByRepo(
        { q: 'owner:me' },
        mockCoderWorkspacesConfig,
      );

      expect(workspaces).toEqual(mockWorkspacesListForRepoSearch);
    });
  });
});
