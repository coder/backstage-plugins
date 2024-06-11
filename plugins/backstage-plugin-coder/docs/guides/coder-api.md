# Coder API - Quick-start guide

## Overview

The Coder plugin makes it easy to bring the entire Coder API into your Backstage deployment. This guide covers how to get it set up so that you can start accessing Coder from Backstage.

Note: this covers the main expected use cases with the plugin. For more information and options on customizing your Backstage deployment further, see our [Advanced API guide](./coder-api-advanced.md).

### Before you begin

Please ensure that you have the Coder plugin fully installed before proceeding. You can find instructions for getting up and running in [our main README](../../README.md).

### Important hooks for using the Coder API

There are a few React hooks that are needed to interact with the Coder API. These can be split into three categories: React Query hooks, core plugin hooks, and convenience hooks.

#### React Query hooks

The Coder plugin uses [React Query/TanStack Query v4](https://tanstack.com/query/v4/docs/framework/react/overview) for all of its data caching. We recommend that you use it for your own data caching, because of the sheer amount of headaches it can spare you.

There are three main hooks that you will likely need:

- `useQuery` - Query and cache data
- `useMutation` - Perform mutations on an API resource
- `useQueryClient` - Coordinate queries and mutations

#### Core plugin hooks

These are hooks that provide direct access to various parts of the Coder API.

- `useCoderApi` - Exposes an object with all available Coder API methods. For the most part, there is no exposed state on this object; you can consider it a "function bucket".
- `useCoderAuth` - Provides methods and state values for interacting with your current Coder auth session from within Backstage.

#### Convenience hooks

- `useCoderQuery` - Simplifies wiring up `useQuery`, `useCoderApi`, and `useCoderAuth`

## Recommendations for accessing the API

1. If querying data, prefer `useCoderQuery`. It automatically wires up all auth logic to React Query (which includes pausing queries if the user is not authenticated). It also lets you access the Coder API via its query function. `useQuery` is also a good escape hatch if `useCoderQuery` doesn't meet your needs, but it requires more work to wire up correctly.
2. If mutating data, you will need to call `useMutation`, `useQueryClient`, and `useCoderApi` in tandem\*. The plugin exposes a `CODER_QUERY_KEY_PREFIX` constant that you can use to group all Coder queries together.

We highly recommend **not** fetching with `useState` + `useEffect`, or with `useAsync`. Both face performance issues when trying to share state. See [ui.dev](https://www.ui.dev/)'s wonderful [_The Story of React Query_ video](https://www.youtube.com/watch?v=OrliU0e09io) for more info on some of the problems they face.

\* A `useCoderMutation` hook is in the works to simplify wiring these up.

### Comparing query caching strategies

|                                                                    | `useState` + `useEffect` | `useAsync` | `useQuery` | `useCoderQuery` |
| ------------------------------------------------------------------ | ------------------------ | ---------- | ---------- | --------------- |
| Automatically handles race conditions                              | 🚫                       | ✅         | ✅         | ✅              |
| Can retain state after component unmounts                          | 🚫                       | 🚫         | ✅         | ✅              |
| Easy, on-command query invalidation                                | 🚫                       | 🚫         | ✅         | ✅              |
| Automatic retry logic when a query fails                           | 🚫                       | 🚫         | ✅         | ✅              |
| Less need to fight dependency arrays                               | 🚫                       | 🚫         | ✅         | ✅              |
| Easy to share state for sibling components                         | 🚫                       | 🚫         | ✅         | ✅              |
| Pre-wired to Coder auth logic                                      | 🚫                       | 🚫         | 🚫         | ✅              |
| Can consume Coder API directly from query function                 | 🚫                       | 🚫         | 🚫         | ✅              |
| Automatically groups Coder-related queries by prefixing query keys | 🚫                       | 🚫         | 🚫         | ✅              |

## Authentication

All API calls to **any** of the Coder API functions will fail if you have not authenticated yet. Authentication can be handled via any of the official Coder components that can be imported via the plugin. However, if there are no Coder components on the screen, the `CoderProvider` component will automatically\* inject a fallback auth button for letting the user add their auth info.

<-- Add video of auth flow with fallback button -->

Once the user has been authenticated, all Coder API functions will become available. When the user unlinks their auth token (effectively logging out), all cached queries that start with `CODER_QUERY_KEY_PREFIX` will automatically be vacated.

\* This behavior can be disabled. Please see our [advanced API guide](./coder-api-advanced.md) for more information.

## Connecting a custom query client to the Coder plugin

By default, the Coder plugin uses and manages its own query client. This works perfectly well if you aren't using React Query for any other purposes, but if you are using it throughout your Backstage deployment, it can cause issues around redundant state (e.g., not all cached data being vacated when the user logs out).

To prevent this, you will need to do two things:

1. Pass in your custom React Query query client into the `CoderProvider` component
2. "Group" your queries with the Coder query key prefix

### Passing in a custom query client

The `CoderProvider` component accepts an optional `queryClient` prop. When provided, the Coder plugin will use this client for **all** queries (those made by the built-in Coder components, or any custom components that you put inside `CoderProvider`).

```tsx
const customQueryClient = new QueryClient();

<CoderProvider queryClient={customQueryClient}>
  <YourCustomComponentsThatNeedAccessToTheCoderPlugin />
</CoderProvider>;
```

### Grouping queries with the Coder query key prefix

The plugin exposes a `CODER_QUERY_KEY_PREFIX` constant that you can use to group all Coder queries together for `useQuery` and `useQueryClient`. All queries made by official Coder components put this as the first value of their query key. The `useCoderQuery` convenience hook also automatically injects this constant at the beginning of all query keys (even if not explicitly added).

```tsx
// Starting all query keys with the constant "groups" them together
const coderApi = useCoderApi();
const workspacesQuery = useQuery({
  queryKey: [CODER_QUERY_KEY_PREFIX, 'workspaces'],
  queryFn: () =>
    coderApi.getWorkspaces({
      limit: 10,
    }),
});

const workspacesQuery2 = useCoderQuery({
  // The query key will automatically have CODER_QUERY_KEY_PREFIX added to the
  // beginning
  queryKey: ['workspaces'],
  queryFn: ({ coderApi }) =>
    coderApi.getWorkspaces({
      limit: 10,
    }),
});

// All grouped queries can be invalidated at once from the query client
const queryClient = useQueryClient();
const invalidateAllCoderQueries = () => {
  queryClient.invalidateQuery({
    queryKey: [CODER_QUERY_KEY_PREFIX],
  });
};

// When the user unlinks their session token, all queries grouped under
// CODER_QUERY_KEY_PREFIX are vacated from the active query cache
function LogOutButton() {
  const { unlinkToken } = useCoderAuth();

  return (
    <button type="button" onClick={unlinkToken}>
      Unlink Coder account
    </button>
  );
}
```

## Component examples

Here are some full code examples showcasing patterns you can bring into your own codebase.

Note: To keep the examples simple, none of them contain any CSS styling or MUI components.

### Displaying recent audit logs

```tsx
import React from 'react';
import { useCoderQuery } from '@coder/backstage-plugin-coder';

function RecentAuditLogsList() {
  const auditLogsQuery = useCoderQuery({
    queryKey: ['audits', 'logs'],
    queryFn: ({ coderApi }) => coderApi.getAuditLogs({ limit: 10 }),
  });

  return (
    <>
      {auditLogsQuery.isLoading && <p>Loading&hellip;</p>}
      {auditLogsQuery.error instanceof Error && (
        <p>Encountered the following error: {auditLogsQuery.error.message}</p>
      )}

      {auditLogsQuery.data !== undefined && (
        <ul>
          {auditLogsQuery.data.audit_logs.map(log => (
            <li key={log.id}>{log.description}</li>
          ))}
        </ul>
      )}
    </>
  );
}
```

## Creating a new workspace

```tsx
import React, { type FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateWorkspaceRequest,
  CODER_QUERY_KEY_PREFIX,
  useCoderQuery,
  useCoderApi,
} from '@coder/backstage-plugin-coder';

export function WorkspaceCreationForm() {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const coderApi = useCoderSdk();
  const queryClient = useQueryClient();

  const currentUserQuery = useCoderQuery({
    queryKey: ['currentUser'],
    queryFn: coderApi.getAuthenticatedUser,
  });

  const workspacesQuery = useCoderQuery({
    queryKey: ['workspaces'],
    queryFn: coderApi.getWorkspaces,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: (payload: CreateWorkspaceRequest) => {
      if (currentUserQuery.data === undefined) {
        throw new Error(
          'Cannot create workspace without data for current user',
        );
      }

      const { organization_ids, id: userId } = currentUserQuery.data;
      return coderApi.createWorkspace(organization_ids[0], userId, payload);
    },
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // If the mutation fails, useMutation will expose the error in the UI via
    // its own exposed properties
    await createWorkspaceMutation.mutateAsync({
      name: newWorkspaceName,
    });

    setNewWorkspaceName('');
    queryClient.invalidateQueries({
      queryKey: [CODER_QUERY_KEY_PREFIX, 'workspaces'],
    });
  };

  return (
    <>
      {createWorkspaceMutation.isSuccess && (
        <p>
          Workspace {createWorkspaceMutation.data.name} created successfully!
        </p>
      )}

      <form onSubmit={onSubmit}>
        <fieldset>
          <legend>Required fields</legend>

          <label>
            Workspace name
            <input
              type="text"
              value={newWorkspaceName}
              onChange={event => setNewWorkspaceName(event.target.value)}
            />
          </label>
        </fieldset>

        <button type="submit">Create workspace</button>
      </form>
    </>
  );
}
```
