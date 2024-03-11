# Plugin API reference – React hooks

This is the main documentation page for the frontend Devcontainer plugin's React hooks.

## `useDevcontainers`

This hook gives you access to a set of properties that describe whether the currently-viewed entity has devcontainers data.

### Type signature

```tsx
export type UseDevcontainersResult = Readonly<{
  tagName: string;
  hasUrl: boolean;
  vsCodeUrl: string | undefined;
}>;

declare function useDevcontainers(): UseDevcontainersResult;
```

### Example usage

```tsx
const YourComponent = () => {
  const state = useDevcontainers();

  return (
    {state.hasUrl ? (
      <>
        <p>Your entity supports devcontainers!</p>
        <a href={state.vsCodeUrl}>Click here to launch VSCode</a>
      </>
    ) : (
      <p>No devcontainers plugin tag detected</p>
    )}
  );
};

<DevcontainersProvider config={devcontainersConfig}>
  <YourComponent />
</DevcontainersProvider>;
```

### Throws

- Will throw a render error if called outside a React component
- Will throw a render error if called outside of a `DevcontainersProvider`
- Will throw a render error if called outside an `EntityLayout` (or any other Backstage component that exposes `Entity` data via React Context)

### Notes

- The types of `hasUrl` and `vsCodeUrl` are defined as part of a [discriminated union](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions). As long as you can prove to the compiler that `hasUrl` is `true` (via a type guard or conditional rendering), `vsCodeUrl` is guaranteed to be of type `string`
