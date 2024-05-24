import {
  type Output,
  array,
  object,
  string,
  union,
  literal,
  optional,
} from 'valibot';

export type ReadonlyJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly ReadonlyJsonValue[]
  | Readonly<{ [key: string]: ReadonlyJsonValue }>;

export type SubscriptionCallback<T = unknown> = (value: T) => void;
export interface Subscribable<T = unknown> {
  subscribe: (callback: SubscriptionCallback<T>) => () => void;
  unsubscribe: (callback: SubscriptionCallback<T>) => void;
}

/**
 * The prefix to use for all Backstage API refs created for the Coder plugin.
 */
export const CODER_API_REF_ID_PREFIX = 'backstage-plugin-coder';

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

export type Workspace = Output<typeof workspaceSchema>;

/**
 * 2024-05-22 - While this isn't documented anywhere, TanStack Query defaults to
 * retrying a failed API request 3 times before exposing an error to the UI
 */
export const DEFAULT_TANSTACK_QUERY_RETRY_COUNT = 3;

export type HtmlHeader = `h${1 | 2 | 3 | 4 | 5 | 6}`;
