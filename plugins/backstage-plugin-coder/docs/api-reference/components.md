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
type WrapperProps = Readonly<
  PropsWithChildren<{
    type: 'card';
  }>
>;

declare function CoderAuthWrapper(props: WrapperProps): JSX.Element;
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
type CoderErrorBoundaryProps = {
  children?: ReactNode;
  fallbackUi?: ReactNode;
};

declare function CoderErrorBoundary(
  props: CoderErrorBoundaryProps,
): JSX.Element;
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

### Type signature

### Sample usage

### Throws

### Notes

## `CoderWorkspacesCard`

### Type signature

### Sample usage

### Throws

### Notes
