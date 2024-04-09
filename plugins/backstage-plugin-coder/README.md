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

3. Add the `CoderProvider` to the application:

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
   // In packages/app/src/components/catalog/EntityPage.tsx
   import { CoderWorkspacesCard } from '@coder/backstage-plugin-coder';

   // ...

   <Grid item md={6} xs={12}>
     <CoderWorkspacesCard readEntityData />
   </Grid>;
   ```

### `app-config.yaml` files

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

You can find more information about what properties are available (and how they're applied) in our [`catalog-info.yaml` file documentation](./docs/catalog-info.md).

## Advanced: Use the Coder API

You can build custom React components and functions that use the Coder API on behalf of the authenticated user.

### Example: List Coder workspaces

```tsx
import { useCoderClient, getErrorMessage } from '@coder/coder-js-sdk'; // https://github.com/coder/coder/tree/main/js-sdk

function CustomWorkspacesComponent () {
  const coderClient = useCoderClient();
  const workspacesState = useAsync(() => {
    return coderClient.api.getWorkspaces({
      q: "owner:me",
    });
  }, []);

  return (
    <CoderAuthWrapper type="card">
      <h1>Your workspaces</h1>

      {workspacesState.loading && <Progress />}
      {workspacesState.error && <ErrorPanel title="Failed to load workspaces" error={getErrorMessage(err)} />}
      {workspaces.length > 0 && (
        {workspaces.map((workspace) => (
          <ul>{workspace.name}<ul>
        ))}
      )}
    </CoderAuthWrapper>
  );
}
```

### Example: Custom Auth Component

```tsx
import { useCoderClient, getErrorMessage } from '@backstage/backstage-plugin-coder'; // https://github.com/coder/coder/tree/main/js-sdk

function useCoderClient () {

  const api =  useApi(coderClientApiRef);
  // 

  return {
    ...api.methods,
    safeRenderState,
  }
}

const myRandomFunction = async () => {

  // some other Backstage thing
  const coderClient = useCoderClient();
  
  if (!coderClient.isAuthenticated) {
    throw new Error("not logged in")
  } else {
    // do stuff
  }
}

function CustomWorkspacesComponent () {
  const coderClient = useCoderClient();
  const workspacesState = useAsync(() => {
    return coderClient.api.getWorkspaces({
      q: "owner:me",
    });
  }, []);

  // TODO: myComponent, probably looks something like
  // <div><input type="password" onClick={??}></div>

  return (
    <CoderAuthWrapper type="card" logInComponent={myComponent}>
      <h1>Your workspaces</h1>

      {workspacesState.loading && <Progress />}
      {workspacesState.error && (
        <ErrorPanel
          title="Failed to load workspaces"
          error={getErrorMessage(err)}
        />
      )}
      {workspaces.length > 0 && (
        {workspaces.map((workspace) => (
          <ul>{workspace.name}</ul>
        ))}
      }
    </CoderAuthWrapper>
  )
```

### Example: Skaffolder Step (or Backend)

```tsx
// TODO: Figure out how the Skaffolder works
// is it FE or BE?
```

```tsx
import { OauthApps } from "@backstage..."

const api = useApi(oauthsomethingsomething)
oapi.oauthtoken

// using sdk directly:
import { sdkFactory } from "@coder/coder-js-sdk"
const sdk = sdkFactory(url, token)
```

// https://github.com/coder/backstage.cdr.dev/commit/0765dc204fcde0a7c3e7e449802d61e2dc70de01

### Example: Custom authentication flow

```tsx
function CustomWorkspacesFunction () {
  const coderClient = useCoderClient();
  const workspacesState = useAsync(() => {
    return coderClient.api.getWorkspaces({
      q: "owner:me",
    });
  }, []);
  
  const clientSnapshot = useSyncExternalStore(
    coderClient.subscribe,
    coderClient.getStateSnapshot
  );

  clientSnapshot.isAuthenticated;
  const err = getErrorMessage(workspacesState.error)


  const workspaces = coderClient.api.getWorkspaces({
    q: "owner:me",
  })

  if (coderClient.isAuthenticated()) {
    
  } else {

  }

}
```

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
