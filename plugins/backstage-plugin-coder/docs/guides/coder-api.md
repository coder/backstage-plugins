# Coder API - Quick-start guide

## Overview

The Coder plugin makes it easy to bring the entire Coder API into your Backstage deployment.

Note: this covers the main expected use cases with the plugin. For more information and options on customizing your Backstage deployment further, see our [Advanced API guide](./coder-api-advanced.md).

### Before you begin

Please ensure that you have the Coder plugin fully installed before proceeding. You can find instructions for getting up and running in [our main README](../../README.md).

### Important hooks for using the Coder API

There are a few React hooks that are needed to interact with the Coder API. These can be split into three categories: React Query hooks, core plugin hooks, and convenience hooks.

#### React Query hooks

The Coder plugin uses React Query/TanStack Query for all of its data caching. We recommend that you use it for your own data caching, because of the sheer amount of headaches it can spare you.

There are three main hooks that you will likely need:

- `useQuery` - Query and cache data
- `useMutation` - Perform mutations on an API resource
- `useQueryClient` - Coordinate queries and mutations

#### Core plugin hooks

These are hooks that provide direct access to various parts of the Coder API.

- `useCoderApi` - Exposes an object with all available Coder API methods
- `useCoderAuth` - Provides methods and state values for interacting with your current Coder auth session

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

Once the user has been authenticated, all Coder API functions will become available. When the user unlinks their auth token (effectively logging out), all queries that start with `CODER_QUERY_KEY_PREFIX` will automatically be vacated.

\* This behavior can be disabled. Please see our [advanced API guide](./coder-api-advanced.md) for more information.

## Component examples

Here are some full code examples showcasing patterns you can bring into your own codebase.

Note: To keep the examples brief, none of them contain any CSS styling.

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
