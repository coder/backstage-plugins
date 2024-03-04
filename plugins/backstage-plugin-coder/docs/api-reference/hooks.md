# Plugin API reference – React hooks

This is the main documentation page for the Coder plugin's React hooks.

## Hook list

- [`useCoderEntityConfig`](#useCoderEntityConfig)
- [`useCoderWorkspaces`](#useCoderWorkspaces)

## `useCoderEntityConfig`

This hook gives you access to compiled [`CoderEntityConfig`](./types.md#coderentityconfig) data.

### Type signature

```tsx
declare function useCoderEntityConfig(): CoderEntityConfig;
```

[Type definition for `CoderEntityConfig`](./types.md#coderentityconfig)

### Example usage

```tsx
function YourComponent() {
  const config = useCoderEntityConfig();
  return <p>Your repo URL is {config.repoUrl}</p>;
}

// All other components provided via @backstage/plugin-catalog
// and should be statically initialized
const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6} xs={12}>
      <YourComponent />
    </Grid>
  </Grid>
);

const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>
  </EntityLayout>
);

// etc.
```

### Throws

- Will throw an error if called outside a React component
- Will throw an error if called outside an `EntityLayout` (or any other Backstage component that exposes `Entity` data via React Context)

### Notes

- The type definition for `CoderEntityConfig` [can be found here](./types.md#coderentityconfig). That section also includes info on the heuristic used for compiling the data
- The hook tries to ensure that the returned value maintains a stable memory reference as much as possible, if you ever need to use that value in other React hooks that use dependency arrays (e.g., `useEffect`, `useCallback`)

## `useCoderWorkspaces`

This hook gives you access to all workspaces that match a given query string. If
[`repoConfig`](#usecoderentityconfig) is defined via `options`, the workspaces returned will be filtered down further to only those that match the the repo.

### Type signature

```ts
type UseCoderWorkspacesOptions = Readonly<
  Partial<{
    repoConfig: CoderEntityConfig;
  }>
>;

declare function useCoderEntityConfig(
  coderQuery: string,
  options?: UseCoderWorkspacesOptions,
): UseQueryResult<readonly Workspace[]>;
```

### Example usage

```tsx
function YourComponent() {
  const entityConfig = useCoderEntityConfig();
  const [filter, setFilter] = useState('owner:me');

  const query = useCoderWorkspaces(filter, {
    repoConfig: entityConfig,
  });

  return (
    <>
      {query.isLoading && <YourLoadingIndicator />}
      {query.isError && <YourErrorDisplay />}

      {query.data?.map(workspace => (
        <ol>
          <li key={workspace.key}>{workspace.name}</li>
        </ol>
      ))}
    </>
  );
}

const coderAppConfig: CoderAppConfig = {
  // ...Properties go here
};

<CoderProvider appConfig={coderAppConfig}>
  <CoderAuthWrapper>
    <YourComponent />
  </CoderAuthWrapper>
</CoderProvider>;
```

### Throws

- Will throw an error if called outside a React component
- Will throw an error if the component calling the hook is not wrapped inside a [`CoderProvider`](./components.md#CoderProvider)

### Notes

- `UseQueryResult` is taken from [React Query v4](https://tanstack.com/query/v4/docs/framework/react/reference/useQuery)
  - We recommend [TK Dodo's Practical React Query blog series](https://tkdodo.eu/blog/practical-react-query) for how to make the most of its features. (Particularly the article on [React Query status checks](https://tkdodo.eu/blog/status-checks-in-react-query))
- The underlying query will not be enabled if:
  1.  The user is not currently authenticated (We recommend wrapping your component inside [`CoderAuthWrapper`](./components.md#coderauthwrapper) to make these checks easier)
  2.  If `repoConfig` is passed in via `options`: when the value of `coderQuery` is an empty string
- `CoderEntityConfig` is the return type of [`useCoderEntityConfig`](#usecoderentityconfig)
