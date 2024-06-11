# Coder API - Quick-start guide

## Overview

The Coder plugin makes it easy to bring the entire Coder API into your Backstage deployment.

### Before you begin

Please ensure that you have the Coder plugin fully installed before proceeding. You can find instructions for getting up and running in [our main README](../../README.md).

### Software architecture

All Coder plugin logic is centered around the `useCoderApi` custom hook. Calling this exposes an object with all Coder API methods, but does not provide any caching. For this, we recommend using React Query/Tanstack Query. The plugin already has a dependency on v4 of the plugin, and even provides a `useCoderQuery` convenience hook to make querying with the API even easier.

## Main recommendations for accessing the API

1. If querying data, prefer `useCoderQuery`. It automatically wires up all auth logic to React Query, and lets you access the Coder API via its query function. `useQuery` is also a good escape hatch if `useCoderQuery` doesn't meet your needs, but it requires more work to wire up correctly.
2. If mutating data, you will need to call `useMutation`, `useQueryClient`, and `useCoderApi` in tandem\*.
3. We recommend not manually setting the auth fallback updating the

We highly recommend **not** fetching with `useState` + `useEffect`, or with `useAsync`. Both face performance issues when trying to share state. See [ui.dev](https://www.ui.dev/)'s wonderful [_The Story of React Query_ video](https://www.youtube.com/watch?v=OrliU0e09io) for more info on some of the problems they face.

\* A `useCoderMutation` hook is in the works to simplify wiring these up.

### Comparing query caching strategies

|                                                                        | `useState` + `useEffect` | `useAsync` | `useQuery` | `useCoderQuery` |
| ---------------------------------------------------------------------- | ------------------------ | ---------- | ---------- | --------------- |
| Automatically handles race conditions                                  | 🚫                       | ✅         | ✅         | ✅              |
| Can retain state after component unmounts                              | 🚫                       | 🚫         | ✅         | ✅              |
| Easy, on-command query invalidation                                    | 🚫                       | 🚫         | ✅         | ✅              |
| Automatic retry logic when a query fails                               | 🚫                       | 🚫         | ✅         | ✅              |
| Less need to fight dependency arrays                                   | 🚫                       | 🚫         | ✅         | ✅              |
| Easy to share state for sibling components                             | 🚫                       | 🚫         | ✅         | ✅              |
| Pre-wired to Coder auth logic                                          | 🚫                       | 🚫         | 🚫         | ✅              |
| Can consume Coder API directly from query function                     | 🚫                       | 🚫         | 🚫         | ✅              |
| Automatically prefixes Coder query keys to group Coder-related queries | 🚫                       | 🚫         | 🚫         | ✅              |

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
