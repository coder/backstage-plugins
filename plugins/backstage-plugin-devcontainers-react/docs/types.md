# Plugin API reference – Important types

## General notes

- All type definitions for the Dev Containers plugin are defined as type aliases and not interfaces, to prevent the risk of accidental interface merging. If you need to extend from one of our types, you can do it in one of two ways:

  ```tsx
  // Type intersection
  type CustomType = DevcontainersConfig & {
    customProperty: boolean;
  };

  // Interface extension - new interface must have a different name
  interface CustomInterface extends DevcontainersConfig {
    customProperty: string;
  }
  ```

## Types directory

- [`DevcontainersConfig`](#devcontainersconfig)

## `DevcontainersConfig`

Defines a set of configuration options for setting how the frontend detects whether a repo entity supports the Dev Containers spec.

### Type definition

```tsx
type DevcontainersConfig = Readonly<{
  /**
   * The tag appended by the devcontainers-backend plugin to flag components as
   * having a devcontainers file.
   *
   * By default, the backend and frontend plugins are configured to use the same
   * tag, but if the backend's tag is overridden, it must also be overridden in
   * the frontend config
   */
  tagName?: string;
}>;
```

### Example usage

See example for [`CoderProvider`](./components.md#coderprovider)

### Notes

- Most properties are defined first and foremost to help integrate the frontend plugin with the [companion backend Dev Containers plugin](../../backstage-plugin-devcontainers-backend/README.md).
- By default, the frontend and backend plugins are configured to use the same value for `tagName` (the string `devcontainers`). If this default is overridden on the backend, the value of `DevcontainersConfig` must be updated on the frontend to match (and vice versa)
