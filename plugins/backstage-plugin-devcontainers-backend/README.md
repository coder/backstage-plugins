# backstage-plugin-devcontainers

This plugin backend was templated using the Backstage CLI. You should replace this text with a description of your plugin backend.

## Installation

This plugin is installed via the `@internal/plugin-backstage-plugin-devcontainers-backend` package. To install it to your backend package, run the following command:

```bash
# From your root directory
yarn --cwd packages/backend add @internal/plugin-backstage-plugin-devcontainers-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@internal/plugin-backstage-plugin-devcontainers-backend'));
```

## Development

This plugin backend can be started in a standalone mode from directly in this
package with `yarn start`. It is a limited setup that is most convenient when
developing the plugin backend itself.

If you want to run the entire project, including the frontend, run `yarn start` from the root directory.
