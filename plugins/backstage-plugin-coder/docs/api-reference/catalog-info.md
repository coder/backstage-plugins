# `catalog-info.yaml` files

This file provides documentation for all properties that the Coder plugin recognizes from Backstage's [`catalog-info.yaml` files](https://backstage.io/docs/features/software-catalog/descriptor-format/).

## Example file

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: python-project
spec:
  type: other
  lifecycle: unknown
  owner: pms

  # Properties for the Coder plugin are placed here
  coder:
    templateName: 'devcontainers'
    mode: 'auto'
    params:
      repo: 'custom'
      region: 'us-pittsburgh'
```

All config properties are placed under the `spec.coder` property.

## Where these properties are used

At present, there are two main areas where these values are used:

- [`CoderWorkspacesCard`](./components.md#coderworkspacescard) (and all sub-components)
- [`useCoderWorkspacesConfig`](./hooks.md#usecoderworkspacesconfig)

## Property listing

### `templateName`

**Type:** Optional `string`

This defines the name of the Coder template you would like to use when creating new workspaces from Backstage.

**Note:** This value has overlap with the `defaultTemplateName` property defined in [`CoderAppConfig`](types.md#coderappconfig). In the event that both values are present, the YAML file's `templateName` property will always be used instead.

### `mode`

**Type:** Optional union of `manual` or `auto`

This defines the workspace creation mode that will be embedded as a URL parameter in any outgoing links to make new workspaces in your Coder deployment. (e.g.,`useCoderWorkspacesConfig`'s `creationUrl` property)

**Note:** This value has overlap with the `defaultMode` property defined in [`CoderAppConfig`](types.md#coderappconfig). In the event that both values are present, the YAML file's `mode` property will always be used instead.

### `params`

**Type:** Optional JSON object of string values (equivalent to TypeScript's `Record<string, string | undefined>`)

This allows you to define additional Coder workspace parameter values that should be passed along to any outgoing URLs for making new workspaces in your Coder deployment. These values are fully dynamic, and unfortunately, cannot have much type safety.

**Note:** The properties from the `params` property are automatically merged with the properties defined via `CoderAppConfig`'s `params` property. In the event of any key conflicts, the params from `catalog-info.yaml` will always win.
