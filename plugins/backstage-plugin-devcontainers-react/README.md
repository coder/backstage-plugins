# @coder/backstage-plugin-devcontainers-react

Automatically launch fully-contained dev environments with [development containers (devcontainers)](https://containers.dev/), right from Backstage!

## Screenshots

![View of the default table component displaying custom tag data](./screenshots/table-view.png)
![View of the sample plugin component](./screenshots/plugin-view.png)
![VS Code after being opened by plugin](./screenshots/vscode.png)

## Features

_Note: While this plugin can be used standalone, it has been designed to be a frontend companion to [`backstage-plugin-devcontainers-backend`](../backstage-plugin-devcontainers-backend/README.md)._

### Standalone features

- Custom hooks for reading devcontainers metadata tags for repo entities, and providing ready-made links to opening the repo in VS Code

### When combined with backend plugin

- Provides an end-to-end solution for automatically managing tags for your Backstage installation, while letting you read them from custom hooks and components

## Setup

### Before you begin

Ensure that you have the following ready to go:

- A Backstage deployment that you can modify
- A GitHub/GitLab/BitBucket repository that has had a `devcontainers.json` file added to it. [VS Code has a quick-start guide for adding devcontainers to a repo](https://code.visualstudio.com/docs/devcontainers/create-dev-container).

_Note: While this plugin has been developed and published by Coder, no Coder installations are required._

### Installation

1. From your Backstage deployment's `app` directory, run the following command:
   ```shell
   yarn --cwd packages/app add @coder/backstage-plugin-devcontainers-react
   ```
2. Navigate to the `app` directory's `EntityPage.tsx` file
3. Add the `DevcontainersProvider` component, as well as any inputs:

   ```tsx
   import {
     type DevcontainersConfig,
     DevcontainersProvider,
   } from '@coder/backstage-plugin-devcontainers-react';

   // The value of tagName must match the tag value that
   // backstage-plugin-devcontainers-backend is configured with
   const devcontainersConfig: DevcontainersConfig = {
     tagName: 'devcontainers',
   };

   // Example usage - you can place the component in other page
   // views as well
   const overviewContent = (
     <Grid container spacing={3} alignItems="stretch">
       {entityWarningContent}
       <Grid item md={6}>
         <EntityAboutCard variant="gridItem" />
       </Grid>

       <Grid item md={6} xs={12}>
         <DevcontainersProvider config={devcontainersConfig}>
           {/* Content that uses Devcontainers goes here */}
         </DzevcontainersProvider>
       </Grid>

       <Grid item md={6} xs={12}>
         <CoderWorkspacesCard readEntityData />
       </Grid>
     </Grid>
   );
   ```

4. If you are trying out the devcontainers functionality, we provide a pre-made `ExampleDevcontainersComponent`. You can include it like so:

   ```tsx
   // Update imports
   import {
     type DevcontainersConfig,
     DevcontainersProvider,
     ExampleDevcontainersComponent,
   } from '@coder/backstage-plugin-devcontainers-react';

   // ExampleDevcontainers must be inside DevcontainersProvider,
   // but it does not need to be a direct child
   <DevcontainersProvider config={devcontainersConfig}>
     <YourCustomWrapperComponent>
       <ExampleDevcontainersComponent />
     </YourCustomWrapperComponent>
   </DevcontainersProvider>;
   ```

5. If you are looking to create your own components, you can import the `useDevcontainers` custom hook.

   ```tsx
   // Inside your custom component's file
   import { useDevcontainers } from '@coder/backstage-plugin-devcontainers-react';

   export const YourComponent = () => {
     const state = useDevcontainers();

     return (
       {state.hasUrl ? (
         <>
           <p>Your entity supports devcontainers!</p>
           <a href={state.vsCodeUrl}>Click here to launch VSCode</a>
         </>
       ) : (
         <p>No devcontainers plugin tag detected</p>
       )}
     );
   };

   // Inside EntityPage.tsx
   <DevcontainersProvider config={devcontainersConfig}>
     <YourComponent />
   </DevcontainersProvider>;
   ```

Have an idea for what kinds of components you would like to see? Feel free to open an issue and make a feature request!

## Limitations

While this does not directly apply to the React plugin, there are limits around the backend plugin's support of `devcontainer.json` files. Please see the backend plugin's README for more information.

## API documentation

Please see the [directory for our API references](./docs/README.md) for additional information.

## Roadmap

This plugin is in active development. The following features are planned:

- TODO: Fill out list

## Contributing

This plugin is part of the Backstage community. We welcome contributions!
