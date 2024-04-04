# Plugin API reference – Important types

## General notes

- All exported type definitions for the Coder plugin are defined as type aliases and not interfaces, to prevent the risk of accidental interface merging. If you need to extend from one of our types, you can do it in one of two ways:

  ```tsx
  // Type intersection
  type CustomType = CoderWorkspacesConfig & {
    customProperty: boolean;
  };

  // Interface extension - new interface must have a different name
  interface CustomInterface extends CoderWorkspacesConfig {
    customProperty: string;
  }
  ```

## Types directory

- [`CoderAppConfig`](#coderappconfig)
- [`CoderWorkspacesConfig`](#coderworkspacesconfig)
- [`Workspace`](#workspace)
- [`WorkspaceResponse`](#workspaceresponse)

## `CoderAppConfig`

Defines a set of configuration options for integrating Backstage with Coder. Primarily has two main uses:

1. Defining a centralized source of truth for certain Coder configuration options (such as which workspace parameters should be used for injecting repo URL values)
2. Defining "fallback" workspace parameters when a repository entity either doesn't have a [`catalog-info.yaml` file](./catalog-info.md) at all, or only specifies a handful of properties.

### Type definition

```tsx
type CoderAppConfig = Readonly<{
  workspaces: Readonly<{
    defaultTemplateName?: string;
    defaultMode?: 'auto' | 'manual' | undefined;
    params?: Record<string, string | undefined>;
    repoUrlParamKeys: readonly [string, ...string[]];
  }>;

  deployment: Readonly<{
    accessUrl: string;
  }>;
}>;
```

### Example usage

See example for [`CoderProvider`](./components.md#coderprovider)

### Notes

- `accessUrl` is the URL pointing at your specific Coder deployment
- `defaultTemplateName` refers to the name of the Coder template that you wish to use as default for creating workspaces. If this is not provided (and there is no `templateName` available from the `catalog-info.yaml` file, you will not be able to create new workspaces from Backstage)
- If `defaultMode` is not specified, the plugin will default to a value of `manual`
- `repoUrlParamKeys` is defined as a non-empty array – there must be at least one element inside it.
- For more info on how this type is used within the plugin, see [`CoderWorkspacesConfig`](#coderworkspacesconfig) and [`useCoderWorkspacesConfig`](./hooks.md#usecoderworkspacesconfig)

## `CoderWorkspacesConfig`

Represents the result of compiling Coder plugin configuration data. The main source for this type is [`useCoderWorkspacesConfig`](./hooks.md#usecoderworkspacesconfig). All data will be compiled from the following sources:

1. The [`CoderAppConfig`](#coderappconfig) passed to [`CoderProvider`](./components.md#coderprovider). This acts as the "baseline" set of values.
2. The entity-specific fields for a given repo's `catalog-info.yaml` file
3. The entity's location metadata (corresponding to the repo)

### Type definition

```tsx
type CoderWorkspacesConfig = Readonly<{
  mode: 'manual' | 'auto';
  templateName: string | undefined;
  params: Record<string, string | undefined>;
  creationUrl: string;
  repoUrl: string | undefined;
  repoUrlParamKeys: [string, ...string[]][];
}>;
```

### Example usage

Let's say that you have these inputs:

```tsx
const appConfig: CoderAppConfig = {
  deployment: {
    accessUrl: 'https://dev.coder.com',
  },

  workspaces: {
    defaultTemplateName: 'devcontainers-config',
    defaultMode: 'manual',
    repoUrlParamKeys: ['custom_repo', 'repo_url'],
    params: {
      repo: 'custom',
      region: 'eu-helsinki',
    },
  },
};
```

```yaml
# https://github.com/Parkreiner/python-project/blob/main/catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: python-project
spec:
  type: other
  lifecycle: unknown
  owner: pms
  coder:
    templateName: 'devcontainers-yaml'
    mode: 'auto'
    params:
      repo: 'custom'
      region: 'us-pittsburgh'
```

Your output will look like this:

```tsx
const config: CoderWorkspacesConfig = {
  mode: 'auto',
  params: {
    repo: 'custom',
    region: 'us-pittsburgh',
    custom_repo: 'https://github.com/Parkreiner/python-project/',
    repo_url: 'https://github.com/Parkreiner/python-project/',
  },
  repoUrlParamKeys: ['custom_repo', 'repo_url'],
  templateName: 'devcontainers-yaml',
  repoUrl: 'https://github.com/Parkreiner/python-project/',

  // Other URL parameters will be included in real code
  // but were stripped out for this example
  creationUrl:
    'https://dev.coder.com/templates/devcontainers-yaml/workspace?mode=auto',
};
```

### Notes

- See the notes for [`CoderAppConfig`](#coderappconfig) for additional information on some of the fields.
- The value of the `repoUrl` property is derived from [Backstage's `getEntitySourceLocation`](https://backstage.io/docs/reference/plugin-catalog-react.getentitysourcelocation/), which does not guarantee that a URL will always be defined.
- This is the current order of operations used to reconcile param data between `CoderAppConfig`, `catalog-info.yaml`, and the entity location data:
  1. Start with an empty `Record<string, string | undefined>` value
  2. Populate the record with the data from `CoderAppConfig`. If there are any property names that start with `default`, those will be stripped out (e.g., `defaultTemplateName` will be injected as `templateName`)
  3. Go through all properties parsed from `catalog-info.yaml` and inject those. If the properties are already defined, overwrite them
  4. Grab the repo URL from the entity's location fields.
  5. For each key in `CoderAppConfig`'s `workspaces.repoUrlParamKeys` property, take that key, and inject it as a key-value pair, using the URL as the value. If the key already exists, always override it with the URL
  6. Use the Coder access URL and the properties defined during the previous steps to create the URL for creating new workspaces, and then inject that.

## `Workspace`

Represents a single Coder workspace.

### Type definition

The below type definitions are likely to be split up at a later date. They are currently defined together for convenience.

```tsx
type WorkspaceAgentStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'timeout';

type WorkspaceAgent = {
  id: string;
  status: WorkspaceAgentStatus;
};

type WorkspaceResource = {
  id: string;
  agents: WorkspaceAgent[];
};

type WorkspaceStatus =
  | 'canceled'
  | 'canceling'
  | 'deleted'
  | 'deleting'
  | 'failed'
  | 'pending'
  | 'running'
  | 'starting'
  | 'stopped'
  | 'stopping';

type Workspace = {
  name: string;
  id: string;
  template_icon: string;
  owner_name: string;
  latest_build: {
    id: string;
    status: WorkspaceStatus;
    resources: WorkspaceResource[];
  };
};
```

### Notes

- Right now, the number of fields is limited. One planned feature is to expand the type definition to make all Coder workspace properties available

## `WorkspaceResponse`

Represents the JSON value that will be part of the response to any workspace API call.

### Type definition

```tsx
type WorkspaceResponse = {
  count: number;
  workspaces: Workspace[];
};
```

### Notes

- `count` is the total number of workspaces in the response
