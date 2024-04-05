/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import { RestHandler, rest } from 'msw';
import { setupServer } from 'msw/node';
/* eslint-enable @backstage/no-undeclared-imports */

import {
  mockWorkspacesList,
  mockWorkspaceBuildParameters,
} from './mockCoderAppData';
import {
  mockCoderAuthToken,
  mockBackstageProxyEndpoint as root,
} from './mockBackstageData';
import type { Workspace, WorkspacesResponse } from '../typesConstants';
import { defaultTokenAuthConfigOptions } from '../api/CoderTokenAuth';

const handlers: readonly RestHandler[] = [
  rest.get(`${root}/workspaces`, (req, res, ctx) => {
    const queryText = String(req.url.searchParams.get('q'));

    let returnedWorkspaces: Workspace[];
    if (queryText === 'owner:me') {
      returnedWorkspaces = mockWorkspacesList;
    } else {
      returnedWorkspaces = mockWorkspacesList.filter(ws =>
        ws.name.includes(queryText),
      );
    }

    return res(
      ctx.status(200),
      ctx.json<WorkspacesResponse>({
        workspaces: returnedWorkspaces,
        count: returnedWorkspaces.length,
      }),
    );
  }),

  rest.get(
    `${root}/workspacebuilds/:workspaceBuildId/parameters`,
    (req, res, ctx) => {
      const buildId = String(req.params.workspaceBuildId);
      const selectedParams = mockWorkspaceBuildParameters[buildId];

      if (selectedParams !== undefined) {
        return res(ctx.status(200), ctx.json(selectedParams));
      }

      return res(ctx.status(404));
    },
  ),

  // This is the dummy request used to verify a user's auth status
  rest.get(`${root}/users/me`, (req, res, ctx) => {
    const headerKey = defaultTokenAuthConfigOptions.authTokenHeaderKey;
    const token = req.headers.get(headerKey);

    if (token === mockCoderAuthToken) {
      return res(ctx.status(200));
    }

    return res(ctx.status(401));
  }),
];

export const server = setupServer(...handlers);
