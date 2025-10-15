# `backstage-plugin-coder-backend`

> [!NOTE]
> This plugin is designed to be the backend counterpart of `backstage-plugin-coder`. In the future, this plugin may become more standalone, but for now, all functionality requires that you also have `backstage-plugin-coder` installed. [See that plugin's setup instructions](../backstage-plugin-coder/README.md#setup) for more information.

## Features

- Management of OAuth2 state for requests sent from the Backstage backend.

## Installing the plugin to support oauth2

1. Run the following command from your Backstage app to install the plugin:
   ```bash
   yarn --cwd packages/app add @coder/backstage-plugin-coder
   ```
2. Import the `createRouter` function from the `@coder/backstage-plugin-coder` package:
   ```ts
   // Imports can be renamed if there would be a name conflict
   import { createRouter as createCoderRouter } from '@coder/backstage-plugin-coder-backend';
   ```
3. Add support for Coder hot module reloading to `main` function in your deployment's `backend/src/index.ts` file:
   ```ts
   const coderEnv = useHotMemoize(module, () => createEnv('coder'));
   ```
4. Register the plugin's oauth route with Backstage from inside the same `main` function:
   ```ts
   apiRouter.use(
     '/auth/coder',
     await createCoderRouter({
       logger: coderEnv.logger,
       config: coderEnv.config,
     }),
   );
   ```
5. [If you haven't already, be sure to register Backstage as an oauth app through Coder](https://coder.com/docs/admin/integrations/oauth2-provider).
6. Add the following values to one of your `app-config.yaml` files:
   ```yaml
   coder:
     deployment:
       # Change the value to match your Coder deployment
       accessUrl: https://dev.coder.com
     oauth:
       clientId: oauth2-client-id-goes-here
       # The client secret isn't used by the frontend plugin, but the backend
       # plugin needs it for oauth functionality to work
       clientSecret: oauth2-secret-goes-here
   ```

Note that the `clientSecret` value is given `secret`-level visibility, and will never be logged anywhere by Backstage.
