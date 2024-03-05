# Plugin API reference – React components

This is the main documentation page for the Coder plugin's React components.

## Component list

- [`CoderAuthWrapper`](#coderauthwrapper)
- [`CoderErrorBoundary`](#codererrorboundary)
- [`CoderProvider`](#coderprovider)
- [`CoderWorkspacesCard`](#coderworkspacescard)

## `CoderAuthWrapper`

This component is designed to simplify authentication checks for other components that need to be authenticated with Coder. Place any child component inside the wrapper. If the user is authenticated, they will see the children. Otherwise, they will see a form for authenticating themselves.

### Type signature

```tsx
type Props = Readonly<
  PropsWithChildren<{
    type: 'card';
  }>
>;

declare function CoderAuthWrapper(props: Props): JSX.Element;
```

### Sample usage

```tsx
function YourComponent() {
  // This query requires authentication
  const query = useCoderWorkspaces('owner:lil-brudder');
  return <p>{query.isLoading ? 'Loading' : 'Not loading'}</p>;
}

<CoderProvider appConfig={yourAppConfig}>
  <CoderAuthWrapper>
    <YourComponent />
  </CoderAuthWrapper>
</CoderProvider>;
```

### Throws

- Throws a render error if this component mounts outside of `CoderProvider`

### Notes

- The wrapper will also stop displaying the child component(s) if the auth token expires, or if the token cannot be safely verified. If that happens, the component will also display some form controls for troubleshooting.
- `CoderAuthWrapper` only supports the `card` type for now, but more types will be added as we add more UI components to the library

## `CoderErrorBoundary`

Provides an error boundary for catching render errors thrown by Coder's custom hooks (e.g., parsing logic).

### Type signature

```tsx
type Props = {
  children?: ReactNode;
  fallbackUi?: ReactNode;
};

declare function CoderErrorBoundary(props: Props): JSX.Element;
```

### Sample usage

```tsx
function YourComponent() {
  // Pretend that there is an issue with this hook, and that it will always
  // throw an error
  const config = useCoderEntityConfig();
  return <p>Will never reach this code</p>;
}

<CoderErrorBoundary>
  <YourComponent />
</CoderErrorBoundary>;
```

### Throws

- Does not throw
  - (Need to verify this - our own code for this component doesn't throw any errors, but it does rely on Backstage's `useApi` hook. Unfortunately, TypeScript type signatures can't communicate whether they throw errors, and the documentation has no info. Will need to go through the source code)

### Notes

- All other Coder components are exported with this component wrapped around them. Unless you are making extension use of the plugin's custom hooks, it is not expected that you will need this component.
- If `fallbackUi` is not specified, `CoderErrorBoundary` will default to a simple error message
- Although Backstage automatically places error boundaries around each exported component, `CoderErrorBoundary` is designed to handle and process specific kinds of errors from the Coder plugins.

## `CoderProvider`

Provides

### Type signature

```tsx
type Props = PropsWithChildren<{
  children?: React.ReactNode;
  appConfig: CoderAppConfig;
  queryClient?: QueryClient;
}>;

declare function CoderProvider(props: Props): JSX.Element;
```

The type of `QueryClient` comes from [Tanstack Router v4](https://tanstack.com/query/v4/docs/reference/QueryClient).

### Sample usage

```tsx
function YourComponent() {
  const query = useCoderWorkspaces('owner:brennan-lee-mulligan');
  return (
    <ul>
      {query.data?.map(workspace => (
        <li key={workspace.id}>{workspace.owner_name}</li>
      ))}
    </ul>
  );
}

const appConfig: CoderAppConfig = {
  deployment: {
    accessUrl: 'https://dev.coder.com',
  },

  workspaces: {
    templateName: 'devcontainers',
    mode: 'manual',
    repoUrlParamKeys: ['custom_repo', 'repo_url'],
    params: {
      repo: 'custom',
      region: 'eu-helsinki',
    },
  },
};

<CoderAppConfig appConfig={appConfig}>
  <YourComponent />
</CoderAppConfig>;
```

### Throws

- Does not throw

### Notes

- This component was deliberately designed to be agnostic of as many Backstage APIs as possible - it can be placed as high as the top of the app, or treated as a wrapper around a specific plugin component.
  - That said, it is recommended that only have one instance of `CoderProvider` per Backstage deployment. Multiple `CoderProvider` component instances could interfere with each other and accidentally fragment caching state
- If you are already using TanStack Query in your deployment, you can provide your own `QueryClient` value via the `queryClient` prop.
  - If not specified, `CoderProvider` will use its own client
  - Even if you aren't using TanStack Query anywhere else, you could consider adding your own client to configure it with more specific settings
  - All Coder-specific queries use a query key prefixed with `coder-backstage-plugin` to prevent any accidental key collisions.
- Regardless of whether you pass in a custom `queryClient` value, `CoderProvider` will spy on the active client to detect any queries that likely failed because of Coder auth tokens expiring

## `CoderWorkspacesCard`

A set of sub-components that together make up a form for searching for Coder workspaces that you own.

\[Need to figure out how to document all the sub-components\]

### Type signature

### Sample usage

### Throws

### Notes

- All sub-components have been designed with accessibility in mind:
  - All content is accessible via screen reader - all icon buttons have accessible text
  - There are no color contrast violations in the components' default color schemes (with either the dark or light themes)
  - When used together (like with `CoderWorkspacesCard`, the entire search area is exposed as an accessible search landmark)
