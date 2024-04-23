import {
  type Output,
  array,
  number,
  object,
  string,
  union,
  literal,
  optional,
} from 'valibot';

/**
 * The prefix to use for all Backstage API refs created for the Coder plugin.
 */
export const CODER_API_REF_ID_PREFIX = 'backstage-plugin-coder';

export type ReadonlyJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly ReadonlyJsonValue[]
  | Readonly<{ [key: string]: ReadonlyJsonValue }>;

export const DEFAULT_CODER_DOCS_LINK = 'https://coder.com/docs/v2/latest';

export const workspaceAgentStatusSchema = union([
  literal('connected'),
  literal('connecting'),
  literal('disconnected'),
  literal('timeout'),
]);

export const workspaceAgentSchema = object({
  id: string(),
  status: workspaceAgentStatusSchema,
});

export const workspaceResourceSchema = object({
  id: string(),
  agents: optional(array(workspaceAgentSchema)),
});

export const workspaceStatusSchema = union([
  literal('canceled'),
  literal('canceling'),
  literal('deleted'),
  literal('deleting'),
  literal('failed'),
  literal('pending'),
  literal('running'),
  literal('starting'),
  literal('stopped'),
  literal('stopping'),
]);

export const workspaceBuildSchema = object({
  id: string(),
  resources: array(workspaceResourceSchema),
  status: workspaceStatusSchema,
});

export const workspaceSchema = object({
  id: string(),
  name: string(),
  template_icon: string(),
  owner_name: string(),
  latest_build: workspaceBuildSchema,
});

export const workspaceBuildParameterSchema = object({
  name: string(),
  value: string(),
});

export const workspaceBuildParametersSchema = array(
  workspaceBuildParameterSchema,
);

export const workspacesResponseSchema = object({
  count: number(),
  workspaces: array(workspaceSchema),
});

export type WorkspaceAgentStatus = Output<typeof workspaceAgentStatusSchema>;
export type WorkspaceAgent = Output<typeof workspaceAgentSchema>;
export type WorkspaceResource = Output<typeof workspaceResourceSchema>;
export type WorkspaceStatus = Output<typeof workspaceStatusSchema>;
export type WorkspaceBuild = Output<typeof workspaceBuildSchema>;
export type Workspace = Output<typeof workspaceSchema>;
export type WorkspacesResponse = Output<typeof workspacesResponseSchema>;
export type WorkspaceBuildParameter = Output<
  typeof workspaceBuildParameterSchema
>;

/**
 * @todo Replace these type definitions with the full Coder SDK API once we have
 * that built out and ready to import into other projects. Be sure to export out
 * all type definitions from the API under a single namespace, too. (e.g.,
 * export type * as CoderSdkTypes from 'coder-ts-sdk')
 *
 * The types for RawCoderSdkApi should only include functions/values that exist
 * on the current "pseudo-SDK" found in the main coder/coder repo, and that are
 * likely to carry over to the full SDK.
 *
 * @see {@link https://github.com/coder/coder/tree/main/site/src/api}
 */
export type WorkspacesRequest = Readonly<{
  after_id?: string;
  limit?: number;
  offset?: number;
  q?: string;
}>;

// Return value used for the dummy requests used to verify a user's auth status
// for the Coder token auth logic
export type UserLoginType = Readonly<{
  login_type: '' | 'github' | 'none' | 'oidc' | 'password' | 'token';
}>;
