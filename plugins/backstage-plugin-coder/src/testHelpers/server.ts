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
  mockUserWithProxyUrls,
  mockWorkspacesList,
  mockWorkspacesListForRepoSearch,
} from './mockCoderPluginData';
import {
  mockBearerToken,
  mockCoderAuthToken,
  mockCoderWorkspacesConfig,
  mockBackstageApiEndpoint as root,
} from './mockBackstageData';
import { CODER_AUTH_HEADER_KEY } from '../api/CoderClient';
import type { User, WorkspacesResponse } from '../api/vendoredSdk';

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
  authenticatedUser: `${root}/users/me`,
} as const satisfies Record<string, string>;

const mainTestHandlers: readonly RestHandler[] = [
  wrappedGet(mockServerEndpoints.workspaces, (req, res, ctx) => {
    const { repoUrl } = mockCoderWorkspacesConfig;
    const paramMatcherRe = new RegExp(
      `param:"\\w+?=${repoUrl.replace('/', '\\/')}"`,
    );

    const queryText = String(req.url.searchParams.get('q'));
    const requestContainsRepoInfo = paramMatcherRe.test(queryText);

    const baseWorkspaces = requestContainsRepoInfo
      ? mockWorkspacesListForRepoSearch
      : mockWorkspacesList;

    const customSearchTerms = queryText
      .split(' ')
      .filter(text => text !== 'owner:me' && !paramMatcherRe.test(text));

    if (customSearchTerms.length === 0) {
      return res(
        ctx.status(200),
        ctx.json<WorkspacesResponse>({
          workspaces: baseWorkspaces,
          count: baseWorkspaces.length,
        }),
      );
    }

    const filtered = mockWorkspacesList.filter(ws => {
      return customSearchTerms.some(term => ws.name.includes(term));
    });

    return res(
      ctx.status(200),
      ctx.json<WorkspacesResponse>({
        workspaces: filtered,
        count: filtered.length,
      }),
    );
  }),

  // This is the dummy request used to verify a user's auth status
  wrappedGet(mockServerEndpoints.authenticatedUser, (_, res, ctx) => {
    return res(ctx.status(200), ctx.json<User>(mockUserWithProxyUrls));
  }),
];

export const server = setupServer(...mainTestHandlers);
