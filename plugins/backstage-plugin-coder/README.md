# @coder/backstage-plugin-coder

Create and manage [Coder workspaces](https://coder.com/docs/v2/latest) from Backstage.

<!-- TOOD: Add Loom -->

## Screenshots

![Coder authentication](./screenshots/coder-auth.png)

![Workspace list page](./screenshots/catalog-item.png)

## Features

- Users link their Coder accounts with Backstage via tokens
- Associate Coder workspaces with catalog items in Backstage
- Workspace list component for viewing and managing workspaces
<!-- - Full Coder API access for custom plugins & integrations -->

## Setup

This assumes you already have a [Coder](https://github.com/coder/coder) deployment running.
Replace `https://coder.example.com` with your Coder deployment access URL. This also assumes
you have a template that has a parameter for a git repository URL (e.g. `git_repo_url`) that auto-clones
the repository or uses [envbuilder](https://coder.com/docs/v2/latest/templates/devcontainers) to build
the devcontainer.

1. If you have a standalone Backstage app (you didn't clone this repo), then do

   ```bash
   yarn --cwd packages/app add @coder/backstage-plugin-coder
   ```

1. Add the proxy key to your `app-config.yaml`:

   ```yaml
   proxy:
     endpoints:
       '/coder':
         # Replace with your Coder deployment access URL and a trailing /
         target: 'https://coder.example.com/'
         changeOrigin: true
         allowedMethods: ['GET']
         allowedHeaders: ['Authorization', 'Coder-Session-Token']
         headers:
           X-Custom-Source: backstage
   ```

1. Add the `CoderProvider` to the application:

   ```tsx
   // In packages/app/src/App.tsx
   import {
     type CoderAppConfig,
     CoderProvider,
   } from '@coder/backstage-plugin-coder';

   const appConfig: CoderAppConfig = {
     deployment: {
       accessUrl: 'https://coder.example.com',
     },

     // Set the default template (and parameters) for
     // catalog items. This can be overridden in the
     // catalog-info.yaml for specific items.
     workspaces: {
       templateName: 'devcontainers',
       mode: 'manual',
       // This parameter is used to filter Coder workspaces
       // by a repo URL parameter.
       repoUrlParamKeys: ['custom_repo', 'repo_url'],
       params: {
         repo: 'custom',
         region: 'eu-helsinki',
       },
     },
   };

   // ...

   export default app.createRoot(
     <CoderProvider appConfig={appConfig}>
       <AlertDisplay />
       <OAuthRequestDialog />
       <AppRouter>
         <Root>{routes}</Root>
       </AppRouter>
     </CoderProvider>,
   );
   ```

   **Note:** You can also wrap a single page or component with `CoderProvider` if you only need Coder in a specific part of your app. See our [API reference](./docs/components.md#coderprovider) for more details.

1. Add the `CoderWorkspacesCard` card to the entity page in your app:

   ```tsx
   // In packages/app/src/components/catalog/EntityPage.tsx
   import { CoderWorkspacesCard } from '@coder/backstage-plugin-coder';

   // ...

   <Grid item md={6} xs={12}>
     <CoderWorkspacesCard readEntityData />
   </Grid>;
   ```

<!-- Individual components of the card can also be imported. See [the plugin documentation](./docs) for full configuration options and API reference. -->

<!-- ### API Access

The plugin provides a `CoderApi` instance for accessing the Coder API. This can be used in custom plugins and integrations. Here is an example component that lists all templates:

```tsx
import { useCoder } from '@coder/backstage-plugin-coder';

// TODO. I believe Michael said this is possible today?
// This can be a very basic component that requires auth
// and lists all templates in a basic unstyled list
// with a refresh button
```

See to the [Coder REST API Reference](https://coder.com/docs/v2/latest/api) for more details -->

## Roadmap

This plugin is in active development. The following features are planned:

- [ ] Add support for only rendering component if `catalog-info.yaml` indicates the item is compatible with Coder
- [ ] OAuth support (vs. token auth) for linking Coder accounts
- [ ] "Open in Coder" button/card component for catalog items
- [ ] Example creating workspaces with Backstage Scaffolder
- [ ] Example dedicated "Coder" page in Backstage

## Contributing

This plugin is part of the Backstage community. We welcome contributions!
