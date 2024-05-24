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

/**
 * 2024-05-22 - While this isn't documented anywhere, TanStack Query defaults to
 * retrying a failed API request 3 times before exposing an error to the UI
 */
export const DEFAULT_TANSTACK_QUERY_RETRY_COUNT = 3;

export type HtmlHeader = `h${1 | 2 | 3 | 4 | 5 | 6}`;
