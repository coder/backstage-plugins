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
import type { WorkspacesResponse } from '../typesConstants';
import { CODER_AUTH_HEADER_KEY } from '../api';

const handlers: readonly RestHandler[] = [
  rest.get(`${root}/workspaces`, (_, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json<WorkspacesResponse>({
        workspaces: mockWorkspacesList,
        count: mockWorkspacesList.length,
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
    const token = req.headers.get(CODER_AUTH_HEADER_KEY);
    if (token === mockCoderAuthToken) {
      return res(ctx.status(200));
    }

    return res(ctx.status(401));
  }),
];

export const server = setupServer(...handlers);
