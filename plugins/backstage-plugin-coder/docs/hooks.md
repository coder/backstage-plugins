# Plugin API reference – React hooks

This is the main documentation page for the Coder plugin's React hooks.

## Hook list

- [`useCoderWorkspacesConfig`](#useCoderWorkspacesConfig)
- [`useCoderWorkspacesQuery`](#useCoderWorkspacesquery)
- [`useWorkspacesCardContext`](#useWorkspacesCardContext)

## `useCoderWorkspacesConfig`

This hook gives you access to compiled [`CoderWorkspacesConfig`](./types.md#coderworkspacesconfig) data.

### Type signature

```tsx
type UseCoderWorkspacesConfigOptions = Readonly<{
  readEntityData?: boolean;
}>;

declare function useCoderWorkspacesConfig(
  options: UseCoderWorkspacesConfigOptions,
): CoderWorkspacesConfig;
```

[Type definition for `CoderWorkspacesConfig`](./types.md#coderWorkspacesconfig)

### Example usage

```tsx
function YourComponent() {
  const config = useCoderWorkspacesConfig();
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
- Will throw if the value of the `readEntityData` property input changes across re-renders

### Notes

- The type definition for `CoderWorkspacesConfig` [can be found here](./types.md#coderworkspacesconfig). That section also includes info on the heuristic used for compiling the data
- The value of `readEntityData` determines the "mode" that the workspace operates in. If the value is `false`/`undefined`, the component will act as a general list of workspaces that isn't aware of Backstage APIs. If the value is `true`, the hook will also read Backstage data during the compilation step.
- The hook tries to ensure that the returned value maintains a stable memory reference as much as possible, if you ever need to use that value in other React hooks that use dependency arrays (e.g., `useEffect`, `useCallback`)

## `useCoderWorkspacesQuery`

This hook gives you access to all workspaces that match a given query string. If
[`workspacesConfig`](#usecoderworkspacesconfig) is defined via `options`, and that config has a defined `repoUrl`, the workspaces returned will be filtered down further to only those that match the the repo.

### Type signature

```ts
type UseCoderWorkspacesQueryOptions = Readonly<{
  coderQuery: string;
  workspacesConfig?: CoderWorkspacesConfig;
}>;

declare function useCoderWorkspacesConfig(
  options: UseCoderWorkspacesQueryOptions,
): UseQueryResult<readonly Workspace[]>;
```

### Example usage

```tsx
function YourComponent() {
  const [filter, setFilter] = useState('owner:me');
  const workspacesConfig = useCoderWorkspacesConfig({ readEntityData: true });
  const queryState = useCoderWorkspacesQuery({ filter, workspacesConfig });

  return (
    <>
      {queryState.isLoading && <YourLoadingIndicator />}
      {queryState.isError && <YourErrorDisplay />}

      {queryState.data?.map(workspace => (
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

- `UseQueryResult` is taken from [TanStack Query v4](https://tanstack.com/query/v4/docs/framework/react/reference/useQuery)
  - We recommend [TK Dodo's Practical React Query blog series](https://tkdodo.eu/blog/practical-react-query) for how to make the most of its features. (Particularly the article on [React Query status checks](https://tkdodo.eu/blog/status-checks-in-react-query))
- The underlying query will not be enabled if:
  1.  The user is not currently authenticated (We recommend wrapping your component inside [`CoderAuthWrapper`](./components.md#coderauthwrapper) to make these checks easier)
  2.  If `repoConfig` is passed in via `options`: when the value of `coderQuery` is an empty string
- The `workspacesConfig` property is the return type of [`useCoderWorkspacesConfig`](#usecoderworkspacesconfig)
  - The only way to get automatically-filtered results is by (1) passing in a workspaces config value, and (2) ensuring that config has a `repoUrl` property of type string (it can sometimes be `undefined`, depending on built-in Backstage APIs).

## `useWorkspacesCardContext`

A helper hook for making it easy to share state between a `CoderWorkspacesCardRoot` and the various sub-components for `CoderWorkspacesCard`, without requiring that they all be direct children.

### Type signature

```tsx
type WorkspacesCardContext = Readonly<{
  queryFilter: string;
  onFilterChange: (newFilter: string) => void;
  workspacesQuery: UseQueryResult<readonly Workspace[]>;
  workspacesConfig: CoderWorkspacesConfig;
  headerId: string;
}>;

declare function useWorkspacesCardContext(): WorkspacesCardContext;
```

### Example usage

```tsx
function YourComponent1() {
  return (
    <CoderWorkspacesCardRoot>
      <YourComponent2 />
    </CoderWorkspacesCardRoot>
  );
}

function YourComponent2() {
  return (
    <GiantNestedComponentWrapper>
      <YourComponent3 />
    </GiantNestedComponentWrapper>
  );
}

function YourComponent3() {
  const { queryFilter, onFilterChange } = useWorkspacesCardContext();

  return (
    <label>
      Example Input
      <input type="text" value={queryFilter} onChange={onFilterChange} />
    </label>
  );
}

<YourComponent1 />;
```

### Throws

- If called outside of `CoderProvider` or `CoderWorkspacesCardRoot`

### Notes

- See [`CoderWorkspacesCard`](./components.md#coderworkspacescard) for more information.
- `headerId` is for ensuring that the landmark region for `CoderWorkspacesCard` is linked to a header, so that the landmark is available to screen readers. It should be used exclusively for accessibility purposes.
