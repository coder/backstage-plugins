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
         # Add methods based on what API calls you need
         allowedMethods: ['GET', 'POST']
         allowedHeaders: ['Authorization', 'Coder-Session-Token']
         headers:
           X-Custom-Source: backstage
   ```

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

### OAuth2 Authentication Setup

The Coder plugin uses Backstage's native OAuth2 system for secure authentication. This requires both backend and frontend configuration.

> [!NOTE] > **New Backend System Required**: This setup uses Backstage's New Backend System and the `@coder/plugin-auth-backend-module-coder-provider` module.

#### Two Ways to Use Coder Authentication

Coder is registered as an auth provider. You can use it for:

**Resource Access (Default)** - Users authenticate to Coder via button in workspace card for API access.

**Sign-In Provider (Optional)** - Users can sign in to Backstage with Coder for seamless workspace access.

> [!TIP]
> Resource Access = backend + frontend setup below. Sign-In Provider = Resource Access + signIn configuration (see Optional section).

#### Backend Setup

1. **Install the auth backend module**:

   ```bash
   yarn workspace backend add @coder/plugin-auth-backend-module-coder-provider
   ```

2. **Register the module** in `packages/backend/src/index.ts`:

   ```typescript
   backend.add(import('@coder/plugin-auth-backend-module-coder-provider'));
   ```

3. **Create an OAuth2 application in Coder**:

   - Navigate to **Deployment Settings → OAuth2 Applications** in your Coder deployment
   - Create a new application
   - Set the callback URL to: `https://your-backstage-instance.com/api/auth/coder/handler/frame`
   - For local development: `http://localhost:7007/api/auth/coder/handler/frame`
   - Save the client ID and client secret

4. **Configure OAuth credentials** in `app-config.yaml` (use environment variables):
   ```yaml
   auth:
     providers:
       coder:
         development:
           clientId: ${CODER_OAUTH_CLIENT_ID}
           clientSecret: ${CODER_OAUTH_CLIENT_SECRET}
           deploymentUrl: ${CODER_DEPLOYMENT_URL}
   ```

For complete backend setup details, see [@coder/plugin-auth-backend-module-coder-provider README](../auth-backend-module-coder-provider/README.md).

#### Frontend Setup (Required)

**Register the Coder auth API** in `packages/app/src/apis.ts`:

```typescript
import { OAuth2 } from '@backstage/core-app-api';
import { coderAuthApiRef } from '@coder/backstage-plugin-coder';
import {
  discoveryApiRef,
  oauthRequestApiRef,
  configApiRef,
  createApiFactory,
} from '@backstage/core-plugin-api';

export const apis: AnyApiFactory[] = [
  // ... other APIs

  createApiFactory({
    api: coderAuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      OAuth2.create({
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'coder',
          title: 'Coder',
          icon: () => null,
        },
        environment: configApi.getOptionalString('auth.environment'),
        defaultScopes: [],
      }),
  }),
];
```

#### Optional: Enable Sign-In Provider

To enable Coder as a Backstage sign-in provider (users can sign in to Backstage with Coder):

1. **Add sign-in resolver** to your existing `auth.providers.coder` configuration in `app-config.yaml`:

   ```yaml
   auth:
     providers:
       coder:
         development:
           # ... OAuth credentials above
           signIn:
             resolvers:
               - resolver: usernameMatchingUserEntityName
   ```

2. **Configure SignInPage** in `packages/app/src/App.tsx`:

   ```typescript
   import { coderAuthApiRef } from '@coder/backstage-plugin-coder';
   import { SignInPage } from '@backstage/core-components';

   const app = createApp({
     components: {
       SignInPage: props => (
         <SignInPage
           {...props}
           providers={[
             {
               id: 'coder-auth-provider',
               title: 'Coder',
               message: 'Sign in using Coder',
               apiRef: coderAuthApiRef,
             },
             // ... other providers
           ]}
         />
       ),
     },
   });
   ```

3. **Add to User Settings** (shows connected providers):

   ```typescript
   import { CoderProviderSettings } from '@coder/backstage-plugin-coder';
   import { UserSettingsPage } from '@backstage/plugin-user-settings';

   <Route
     path="/settings"
     element={<UserSettingsPage providerSettings={<CoderProviderSettings />} />}
   />;
   ```

#### How OAuth Works

- **Resource Access:** Click "Sign in with Coder OAuth" in workspace card → OAuth popup → token stored
- **Sign-In Provider:** Sign in via Backstage login page → token automatically available

Both support managing connections in Settings → Authentication Providers. Token persistence and refresh handled by Backstage's `OAuth2` helper.

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

- [ ] OAuth2 support (vs. token auth) for linking Coder accounts
- [ ] Example component using the Coder API to make authenticated requests on behalf of the user
- [ ] Add support for only rendering component if `catalog-info.yaml` indicates the item is compatible with Coder
- [ ] OAuth support (vs. token auth) for linking Coder accounts
- [ ] "Open in Coder" button/card component for catalog items
- [ ] Example creating workspaces with Backstage Scaffolder
- [ ] Example dedicated "Coder" page in Backstage

## Contributing

This plugin is part of the Backstage community. We welcome contributions!
