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
  mockWorkspacesListForRepoSearch,
} from './mockCoderAppData';
import {
  mockBearerToken,
  mockCoderAuthToken,
  mockCoderWorkspacesConfig,
  mockBackstageApiEndpoint as root,
} from './mockBackstageData';
import type { WorkspacesResponse } from '../typesConstants';
import { CODER_AUTH_HEADER_KEY } from '../api/CoderClient';
import { UserLoginType } from '../typesConstants';

type RestResolver<TBody extends DefaultBodyType = any> = ResponseResolver<
  RestRequest<TBody>,
  RestContext,
  TBody
>;

export type RestResolverMiddleware<TBody extends DefaultBodyType = any> = (
  resolver: RestResolver<TBody>,
) => RestResolver<TBody>;

const defaultMiddleware = [
  function validateCoderSessionToken(handler) {
    return (req, res, ctx) => {
      const token = req.headers.get(CODER_AUTH_HEADER_KEY);
      if (token === mockCoderAuthToken) {
        return handler(req, res, ctx);
      }

      return res(ctx.status(401));
    };
  },
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

export function wrappedGet<TBody extends DefaultBodyType = any>(
  path: string,
  resolver: RestResolver<TBody>,
): RestHandler {
  const wrapped = wrapInDefaultMiddleware(resolver);
  return rest.get(path, wrapped);
}

export const mockServerEndpoints = {
  workspaces: `${root}/workspaces`,
  userLoginType: `${root}/users/me/login-type`,
} as const satisfies Record<string, string>;

const mainTestHandlers: readonly RestHandler[] = [
  wrappedGet(mockServerEndpoints.workspaces, (req, res, ctx) => {
    const queryText = String(req.url.searchParams.get('q'));
    const { repoUrl, repoUrlParamKeys } = mockCoderWorkspacesConfig;

    const requestContainsRepoInfo = repoUrlParamKeys.some(key => {
      return queryText.includes(`param:"${key}=${repoUrl}`);
    });

    if (requestContainsRepoInfo) {
      return res(
        ctx.status(200),
        ctx.json<WorkspacesResponse>({
          workspaces: mockWorkspacesListForRepoSearch,
          count: mockWorkspacesListForRepoSearch.length,
        }),
      );
    }

    if (queryText === 'owner:me') {
      return res(
        ctx.status(200),
        ctx.json<WorkspacesResponse>({
          workspaces: mockWorkspacesList,
          count: mockWorkspacesList.length,
        }),
      );
    }

    const filtered = mockWorkspacesList.filter(ws =>
      ws.name.includes(queryText),
    );

    return res(
      ctx.status(200),
      ctx.json<WorkspacesResponse>({
        workspaces: filtered,
        count: filtered.length,
      }),
    );
  }),

  // This is the dummy request used to verify a user's auth status
  wrappedGet(mockServerEndpoints.userLoginType, (_, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json<UserLoginType>({
        login_type: 'token',
      }),
    );
  }),
];

export const server = setupServer(...mainTestHandlers);
