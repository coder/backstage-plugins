# Plugin API reference – React hooks

This is the main documentation page for the frontend Devcontainer plugin's React hooks.

## Hooks directory

- [`useDevcontainers`](#usedevcontainers)

## `useDevcontainers`

This hook gives you access to a set of properties that describe whether the currently-viewed entity has Dev Containers data.

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
        <p>Your entity supports Dev Containers!</p>
        <a href={state.vsCodeUrl}>Click here to launch VS Code</a>
      </>
    ) : (
      <p>No Dev Containers plugin tag detected</p>
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

- This hook works by detecting whether the tag that you specify for [`DevcontainersConfig`](./types.md#devcontainersconfig) (explicitly or implicitly) can be found in the current entity.
  - The frontend plugin assumes that the tag will automatically be added to relevant entities via something like the backend plugin, but as [discussed here](../../backstage-plugin-devcontainers-backend/README.md#limitations), there are limitations around this functionality.
- The types of `hasUrl` and `vsCodeUrl` are defined as part of a [discriminated union](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions). As long as you can prove to the compiler that `hasUrl` is `true` (via a type guard or conditional rendering), `vsCodeUrl` is guaranteed to be of type `string`
