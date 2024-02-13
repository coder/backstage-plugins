/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import { RestHandler, rest } from 'msw';
import { setupServer } from 'msw/node';
/* eslint-enable @backstage/no-undeclared-imports */

import {
  mockWorkspace,
  mockWorkspaceBuild,
  mockWorkspaceBuildParameter,
} from './mockCoderAppData';
import {
  cleanedRepoUrl,
  mockCoderAuthToken,
  mockBackstageProxyEndpoint as root,
} from './mockBackstageData';
import {
  WorkspaceBuildParameter,
  type Workspace,
  WorkspacesResponse,
} from '../typesConstants';
import { CODER_AUTH_HEADER_KEY } from '../api';

const repoBuildParamId = 'mock-repo';

const handlers: readonly RestHandler[] = [
  rest.get(`${root}/workspaces`, (_, res, ctx) => {
    const sampleWorkspaces = new Array<Workspace>(5)
      .fill(mockWorkspace)
      .map<Workspace>((ws, i) => {
        const oneIndexed = i + 1;

        return {
          ...ws,
          id: `${ws.id}-${oneIndexed}`,
          name: `${ws.name}-${oneIndexed}`,
          latest_build: {
            ...mockWorkspaceBuild,
            id: i === 0 ? repoBuildParamId : `${ws.name}-${oneIndexed}`,
          },
        };
      });

    return res(
      ctx.status(200),
      ctx.json<WorkspacesResponse>({
        workspaces: sampleWorkspaces,
        count: sampleWorkspaces.length,
      }),
    );
  }),

  rest.get(
    `${root}/workspacebuilds/:workspaceBuildId/parameters`,
    (req, res, ctx) => {
      const workspaceBuildId = (req.params.workspaceBuildId ?? '') as string;

      const sampleBuildParams = new Array<WorkspaceBuildParameter>(5)
        .fill(mockWorkspaceBuildParameter)
        .map<WorkspaceBuildParameter>((wbp, i) => {
          const oneIndexed = i + 1;
          const useRepoName = i === 0 && workspaceBuildId === repoBuildParamId;

          return {
            ...wbp,
            name: useRepoName ? 'repo_url' : `${wbp.value}-${oneIndexed}`,
            value: useRepoName ? cleanedRepoUrl : `${wbp.value}-${oneIndexed}`,
          };
        });

      return res(
        ctx.status(200),
        ctx.json<readonly WorkspaceBuildParameter[]>(sampleBuildParams),
      );
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
