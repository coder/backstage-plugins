/* eslint-disable @backstage/no-undeclared-imports -- For test helpers only */
import {
  type DefaultBodyType,
  type ResponseResolver,
  type RestContext,
  type RestHandler,
  type RestRequest,
  rest,
} from 'msw';
import { setupServer } from 'msw/node';
/* eslint-enable @backstage/no-undeclared-imports */

import {
  mockWorkspacesList,
  mockWorkspaceBuildParameters,
} from './mockCoderAppData';
import {
  mockBearerToken,
  mockCoderAuthToken,
  mockBackstageProxyEndpoint as root,
} from './mockBackstageData';
import type { Workspace, WorkspacesResponse } from '../typesConstants';
import { CODER_AUTH_HEADER_KEY } from '../api/api';

type RestResolver<TBody extends DefaultBodyType = any> = ResponseResolver<
  RestRequest<TBody>,
  RestContext,
  TBody
>;

export type RestResolverMiddleware<TBody extends DefaultBodyType = any> = (
  resolver: RestResolver<TBody>,
) => RestResolver<TBody>;

const defaultMiddleware = [
  function validateBearerToken(handler) {
    return (req, res, ctx) => {
      const tokenRe = /^Bearer (.+)$/;
      const authHeader = req.headers.get('Authorization') ?? '';
      const [, bearerToken] = tokenRe.exec(authHeader) ?? [];

      if (bearerToken === mockBearerToken) {
        return handler(req, res, ctx);
      }

      return res(ctx.status(401));
    };
  },
] as const satisfies readonly RestResolverMiddleware[];

export function wrapInDefaultMiddleware<TBody extends DefaultBodyType = any>(
  resolver: RestResolver<TBody>,
): RestResolver<TBody> {
  return defaultMiddleware.reduceRight((currentResolver, middleware) => {
    const recastMiddleware =
      middleware as unknown as RestResolverMiddleware<TBody>;

    return recastMiddleware(currentResolver);
  }, resolver);
}

function wrappedGet<TBody extends DefaultBodyType = any>(
  path: string,
  resolver: RestResolver<TBody>,
): RestHandler {
  const wrapped = wrapInDefaultMiddleware(resolver);
  return rest.get(path, wrapped);
}

const mainTestHandlers: readonly RestHandler[] = [
  wrappedGet(`${root}/workspaces`, (req, res, ctx) => {
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

  wrappedGet(
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
  wrappedGet(`${root}/users/me`, (req, res, ctx) => {
    const token = req.headers.get(CODER_AUTH_HEADER_KEY);
    if (token === mockCoderAuthToken) {
      return res(ctx.status(200));
    }

    return res(ctx.status(401));
  }),
];

export const server = setupServer(...mainTestHandlers);
