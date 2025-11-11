# Integrate Coder Workspaces into Backstage

Create and manage [Coder workspaces](https://coder.com/docs/v2/latest) from Backstage.

## Screenshots

![Coder authentication](./screenshots/coder-auth.png)

![Workspace list page](./screenshots/catalog-item.png)

## Features

- Users link their Coder accounts with Backstage via tokens
- Associate Coder workspaces with catalog items in Backstage
- Workspace list component for viewing and managing workspaces

## Setup

This assumes you already have a [Coder](https://github.com/coder/coder) deployment running.
Replace `https://coder.example.com` with your Coder deployment access URL. This also assumes
you have a template that has a parameter for a git repository URL (e.g. `git_repo_url`) that auto-clones
the repository or uses [envbuilder](https://coder.com/docs/v2/latest/templates/devcontainers) to build
the Dev Container.

1. If you have a standalone Backstage app (you didn't clone this repo), then do

   ```bash
   yarn --cwd packages/app add @coder/backstage-plugin-coder
   ```

2. Add the proxy key to your `app-config.yaml`:

   ```yaml
   proxy:
     endpoints:
       '/coder':
         # Replace with your Coder deployment access URL (add a trailing slash)
         target: 'https://coder.example.com/'

         changeOrigin: true
         allowedMethods: ['GET'] # Additional methods will be supported soon!
         allowedHeaders: ['Authorization', 'Coder-Session-Token']
         headers:
           X-Custom-Source: backstage
   ```

### Old Frontend System

3. Add the `CoderProvider` to the application:

   ```tsx
   // packages/app/src/App.tsx

   import {
     type CoderAppConfig,
     CoderProvider,
   } from '@coder/backstage-plugin-coder';

   const appConfig: CoderAppConfig = {
     deployment: {
       accessUrl: 'https://coder.example.com',
     },

     // Set the default template (and parameters) for
     // catalog items. Individual properties can be overridden
     // by a repo's catalog-info.yaml file
     workspaces: {
       defaultTemplateName: 'devcontainers',
       defaultMode: 'manual',

       // This property defines which parameters in your Coder
       // workspace templates are used to store repository links
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

   **Note:** You can also wrap a single page or component with `CoderProvider` if you only need Coder in a specific part of your app. See our [API reference](./docs/README.md) (particularly the section on [the `CoderProvider` component](./docs/components.md#coderprovider)) for more details.

4. Add the `CoderWorkspacesCard` card to the entity page in your app:

   ```tsx
   // packages/app/src/components/catalog/EntityPage.tsx

   import { CoderWorkspacesCard } from '@coder/backstage-plugin-coder';

   // We recommend placing the component inside of overviewContent
   const overviewContent = (
     <Grid container spacing={3} alignItems="stretch">
       {entityWarningContent}
       <Grid item md={6}>
         <EntityAboutCard variant="gridItem" />
       </Grid>

       {/* Coder component should go inside Grid to help it work with MUI layouts */}
       <Grid item md={6} xs={12}>
         <CoderWorkspacesCard readEntityData />
       </Grid>

       {/* Other elements for overviewContent go here */}
     </Grid>
   );
   ```

### New Frontend System

Follow these steps to detect and configure the Coder plugin if you'd like to use it in an application that supports the new Backstage frontend system.

#### Package detection

Once you install the `@coder/backstage-plugin-coder` package using your preferred package manager, you have to choose how the package should be detected by the app. The package can be automatically discovered when the feature discovery config is set, or it can be manually enabled via code (for more granular package customization cases, such as extension overrides).

<table>
  <tr>
    <td>Via config</td>
    <td>Via code</td>
  </tr>
  <tr>
    <td>
      <pre lang="yaml">
        <code>
# app-config.yaml
  app:
    # Enable package discovery for all plugins
    packages: 'all'
  ---
  app:
    # Enable package discovery only for Coder
    packages:
      include:
        - '@coder/backstage-plugin-coder'
        </code>
      </pre>
    </td>
    <td>
      <pre lang="javascript">
       <code>
// packages/app/src/App.tsx
import { createApp } from '@backstage/frontend-defaults';
import coderPlugin from '@coder/backstage-plugin-coder/alpha';
//...
const app = createApp({
  // ...
  features: [
    //...
    coderPlugin,
  ],
});

//...
       </code>
      </pre>
    </td>
  </tr>
</table>

#### Extension configurations

Currently, the plugin installs 4 extensions: 2 APIs (url sync and client wrapper), 1 App root wrapper (the coder provider), and 1 Entity page card (the overview workspaces card).

To be able to connect to your Coder organization it is mandatory that you set the Coder provider configuration in the `app-config.yaml` file:

```yml
# app-config.yaml
app:
  extensions:
    # Defining the Coder provider app config
    - 'app-root-wrapper:coder':
        config:
          # (required)
          appConfig:
            deployment:
              # Replace with your Coder deployment access URL
              accessUrl: 'https://dev.coder.app'
            # Set the default template (and parameters) for
            # catalog items. Individual properties can be overridden
            # by a repo's catalog-info.yaml file
            workspaces:
              defaultTemplateName: 'devcontainers'
              defaultMode: 'manual'
              # This property defines which parameters in your Coder
              # workspace templates are used to store repository links
              repoUrlParamKeys: ['custom_repo', 'repo_url']
              params:
                repo: 'custom'
                region: 'eu-helsinki'
```

The Coder plugin also installs the `workspaces` card in the Catalog entity overview tab by default. No code is needed to see it on the screen, but there are a few optional customizations that can be set via the `app-config.yaml` file:

```yml
# app-config.yaml
app:
  extensions:
    - 'entity-card:coder':
        config:
          # (optional) determine in which Catalog overview tab area the card will be shown
          # defaults to "content", but can be changed to "info" or "summary"
          type: 'summary'
          # (optional) determines whether to show the card or not
          # the card is always shown, but you can add a filter for example to show it only for
          # entities of kind component
          filter:
            kind: 'component'
          # (optional) define a default filter for the workspaces search
          # defaults to "owner:me"
          defaultQueryFilter: 'owner:guest'
          # (optional) whether to read entity metadata from catalog-info.yaml
          readEntityData: true
```

#### Extension overrides

If you want to use your own custom version of the Workspaces Card component, override the default Workspaces Card component as follows:

```tsx
// packages/app/src/plugins/coder/index.tsx
import React, { useState } from 'react';
import { compatWrapper } from '@backstage/core-compat-api';
import coderPlugin from '@coder/backstage-plugin-coder/alpha';
// ...

export default coderPlugin.withOverrides({
  extensions: [
    // Get the default workspaces card and override its component loader
    coderPlugin.getExtension('entity-card:coder').override({
      params: {
        async loader() {
          const { CoderWorkspacesCard } = await import(
            '@coder/backstage-plugin-coder'
          );
          function Component() {
            const [searchText, setSearchText] = useState('owner:me');
            // The "compatWrapper" is needed because CoderWorkspacesCard is still using legacy frontend system utilities
            // such as the AppContext
            return compatWrapper(
              <CoderWorkspacesCard
                queryFilter={searchText}
                onFilterChange={newSearchText => setSearchText(newSearchText)}
              />,
            );
          }
          return <Component />;
        },
      },
    }),
  ],
});

// packages/app/src/App.tsx
// ...
import coderPluginWithOverrides from './plugins/coder';

// ...

const app = createApp({
  features: [
    // ...
    coderPluginWithOverrides,
  ],
});
```

Additionally, if you don't want a global Coder provider installed and would rather create your own page to view Coder information, here's an example of how you can do that:

```tsx
// packages/app/src/plugins/coder/index.tsx
import { PageBlueprint } from '@backstage/frontend-plugin-api';
import coderPlugin from '@coder/backstage-plugin-coder/alpha';
// ...

function CustomCoderWorkspacesPage() {
  // Your page code goes here
}

// In this case there is no Coder page to override as the Coder plugin do not provide a page extension by default
// We have to create a brand new page extension
const customCoderWorspacesPage = PageBlueprint.makeWithOverrides({
  // You can decide if you want to keep config in the "app-config.yaml" file, or define it in the code instead.
  // In this example we decided to define a config schema for the page so the config value continue be set in the "app-config.yaml" file
  config: {
    schema: {
      fallbackAuthUiMode: z => z
        .union([
          z.literal('restrained'),
          z.literal('assertive'),
          z.literal('hidden')
        ])
        .optional(),
      appConfig: z => z.object({
        deployment: z.object({
          accessUrl: z.string(),
        }),
        workspaces: z.object({
          defaultMode: z
            .union([z.literal('manual'), z.literal('auto')])
            .optional(),
          defaultTemplateName: z.string().optional(),
          params: z.record(z.string(), z.string().optional()).optional(),
          repoUrlParamKeys: z.tuple([z.string()]).rest(z.string()),
        }),
      }),
    }
  },
  factory(originalFactory, context) {
    // Getting the appConfig defined in the "app-config.yaml" file
    const appConfig = context.config.appConfig;
    return originalFactory({
        path: '/coder',
        async loader() {
          const { CoderProvider } = await import('@coder/backstage-plugin-coder');
          // The "compatWrapper" is needed because CoderProvider is still using legacy frontend system utilities
          return compatWrapper(
            <CoderProvider appConfig={appConfig}>
              <CustomCoderWorkspacesPage />
            </CoderProvider>
          );
        }
    });
  },
});

export default coderPlugin.withOverrides({
  extensions: [
    customCoderWorspacesPage,
  ],
});

// packages/app/src/App.tsx
import { createApp } from '@backstage/frontend-defaults';
import coderPluginWithOverrides from './plugins/coder';
// ...

const app = createApp({
  features: [
    // ...
    coderPluginWithOverrides,
  ],
});
```

Now we just need to update the configs in the `app-config.yaml` file:

```diff
# app-config.yaml
app:
  extensions:
    # ...
-   - 'app-root-wrapper:coder':
+   # As the provider extension was disabled, the app config is now passed to the new page extension
+   - 'page:coder':
        config:
          # (required)
          appConfig:
            deployment:
              # Replace with your Coder deployment access URL
              accessUrl: 'https://dev.coder.app'
            # Set the default template (and parameters) for
            # catalog items. Individual properties can be overridden
            # by a repo's catalog-info.yaml file
            workspaces:
              defaultTemplateName: 'devcontainers'
              defaultMode: 'manual'
              # This property defines which parameters in your Coder
              # workspace templates are used to store repository links
              repoUrlParamKeys: ['custom_repo', 'repo_url']
              params:
                repo: 'custom'
                region: 'eu-helsinki'
+   # Disabling the default provider extension as we are not using it anymore 
+   - app-root-wrapper:coder: false
+   # Also disabling the default entity card as we now have a page for it
+   - entity-card:coder: false
```

### `catalog-info.yaml` files

In addition to the above, you can define additional properties on your specific repo's `catalog-info.yaml` file.

Example:

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

You can find more information about what properties are available (and how they're applied) in our [`catalog-info.yaml` file documentation](./docs/api-reference/catalog-info.md).

## Roadmap

This plugin is in active development. The following features are planned:

- [ ] Example component using the Coder API to make authenticated requests on behalf of the user
- [ ] Add support for only rendering component if `catalog-info.yaml` indicates the item is compatible with Coder
- [ ] OAuth support (vs. token auth) for linking Coder accounts
- [ ] "Open in Coder" button/card component for catalog items
- [ ] Example creating workspaces with Backstage Scaffolder
- [ ] Example dedicated "Coder" page in Backstage

## Contributing

This plugin is part of the Backstage community. We welcome contributions!
