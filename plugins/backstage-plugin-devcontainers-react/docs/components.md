# Plugin API reference – React components

This is the main documentation page for the Coder plugin's React components.

## Component list

- [`ExampleDevcontainersComponent`](#exampledevcontainerscomponent)

## `ExampleDevcontainersComponent`

This component is designed as a lightweight demonstration of the main [`useDevcontainers` hook](./hooks.md#usedevcontainers).

Its main functionality is:

- Detecting whether the current repo entity being viewed supports devcontainers
- Displaying a link to launch the repo in a devcontainer via VS Code.

It does not have support for extensibility.

### Type signature

```tsx
declare function ExampleDevcontainersComponent(): JSX.Element;
```

### Sample usage

```tsx
<DevcontainersProvider config={devcontainersConfig}>
  <ExampleDevcontainersComponent />
</DevcontainersProvider>
```

### Throws

- Throws a render error if this component mounts outside of `DevcontainersProvider`

### Notes

- While this component was never designed to serve as more than a demo, if you feel that a polished version of this component could be helpful to you, please let us know by opening a GitHub issue.
