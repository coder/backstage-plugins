# `@coder/plugin-auth-backend-module-coder-provider`

Backend authentication module for integrating Coder OAuth2 with Backstage's native authentication system.

> [!NOTE]
> This module provides OAuth2 authentication for accessing Coder resources through Backstage. It integrates with Backstage's standard auth system and is designed to work with the `@coder/backstage-plugin-coder` frontend plugin.

## Features

- **Native Backstage Auth Integration**: Registers Coder as an OAuth2 provider using Backstage's standard authentication system
- **Resource Access Provider**: Provides authenticated access to Coder API for workspace management
- **User Profile Fetching**: Automatically retrieves user information from Coder's API
- **Secure Token Management**: Handles OAuth2 token exchange and refresh using industry-standard practices

## Architecture

This module uses Backstage's New Backend System (NBS) and registers with the `authProvidersExtensionPoint`. It provides:

- OAuth2 authorization flow (`/api/auth/coder/start`)
- Token exchange and validation
- User profile fetching from Coder's `/api/v2/users/me` endpoint
- Session management through Backstage's auth system

## Installation

### Prerequisites

- Backstage version 1.24+ with the New Backend System
- A Coder deployment with OAuth2 provider enabled (requires `oauth2` experiment flag)
- OAuth2 application registered in Coder

### Steps

1. **Install the module** in your Backstage backend:

   ```bash
   yarn workspace backend add @coder/plugin-auth-backend-module-coder-provider
   ```

2. **Register the module** in your `packages/backend/src/index.ts`:

   ```typescript
   // Add the Coder auth provider module
   backend.add(import('@coder/plugin-auth-backend-module-coder-provider'));
   ```

3. **Configure Coder deployment** in your `app-config.yaml`:

   ```yaml
   coder:
     deployment:
       accessUrl: https://your-coder-deployment.com
   ```

4. **Configure OAuth credentials** in your `app-config.yaml` (use environment variables for production):

   ```yaml
   auth:
     environment: production
     providers:
       coder:
         production:
           clientId: ${CODER_OAUTH_CLIENT_ID}
           clientSecret: ${CODER_OAUTH_CLIENT_SECRET}
           deploymentUrl: ${CODER_DEPLOYMENT_URL}
   ```

   > [!TIP]
   > For local development, create an `app-config.local.yaml` file (gitignored) with your credentials.

5. **Create an OAuth2 application in Coder**:

   - Navigate to your Coder deployment's OAuth2 settings
   - Create a new OAuth2 application
   - Set the callback URL to: `https://your-backstage-instance.com/api/auth/coder/handler/frame`
   - Replace `your-backstage-instance.com` with your actual Backstage domain
   - Save the client ID and client secret

## Configuration

### Environment-Specific Configuration

For different environments, configure the provider in your `app-config` files:

```yaml
auth:
  environment: ${AUTH_ENVIRONMENT:-production}
  providers:
    coder:
      production:
        clientId: ${CODER_OAUTH_CLIENT_ID}
        clientSecret: ${CODER_OAUTH_CLIENT_SECRET}
        deploymentUrl: ${CODER_DEPLOYMENT_URL}
      development:
        clientId: ${CODER_OAUTH_CLIENT_ID}
        clientSecret: ${CODER_OAUTH_CLIENT_SECRET}
        deploymentUrl: ${CODER_DEPLOYMENT_URL}
```

### Configuration Reference

| Key             | Description                     | Required |
| --------------- | ------------------------------- | -------- |
| `clientId`      | OAuth2 client ID from Coder     | Yes      |
| `clientSecret`  | OAuth2 client secret from Coder | Yes      |
| `deploymentUrl` | URL of your Coder deployment    | Yes      |

> [!IMPORTANT]
> The `clientSecret` is marked as sensitive and will be redacted in logs.

## Usage

Once configured, users can authenticate with Coder through the Backstage frontend:

1. Navigate to a page with the Coder plugin
2. Click "Sign in with Coder OAuth"
3. Authorize access in the OAuth popup
4. The frontend will receive and store the Coder session token

The authentication token is automatically used by the `@coder/backstage-plugin-coder` frontend plugin for all Coder API requests.

## Differences from `@coder/backstage-plugin-coder-backend`

This module **replaces** the OAuth functionality previously provided by `@coder/backstage-plugin-coder-backend`.

> [!NOTE]
> You can safely remove `@coder/backstage-plugin-coder-backend` from your backend if you are only using it for OAuth. Other functionality from that plugin (if any) should be evaluated separately.

## Enabling Coder OAuth2 Provider

Coder's OAuth2 provider is currently experimental. To enable it:

1. **Start Coder with the oauth2 experiment flag**:

   ```bash
   coder server --experiments oauth2
   ```

   Or set the environment variable:

   ```bash
   export CODER_EXPERIMENTS=oauth2
   ```

2. **Create an OAuth2 application** via the Coder web UI or API:
   - Navigate to **Deployment Settings → OAuth2 Applications**
   - Click **Create Application**
   - Set the callback URL to: `https://your-backstage-instance.com/api/auth/coder/handler/frame`
   - Replace `your-backstage-instance.com` with your actual Backstage domain

For more information, see [Coder's OAuth2 Provider documentation](https://coder.com/docs/admin/integrations/oauth2-provider).

## Troubleshooting

### "Auth provider not configured" error

**Solution**: Ensure `auth.providers.coder` is configured in your `app-config.yaml` or `app-config.local.yaml`.

### OAuth popup shows 401/403 error

**Solution**: Verify your OAuth2 application credentials in Coder match your Backstage configuration.

### "Callback URL mismatch" error

**Solution**: Ensure the callback URL in your Coder OAuth2 application settings exactly matches your Backstage instance:

```
https://your-backstage-instance.com/api/auth/coder/handler/frame
```

The URL must use HTTPS in production and match your Backstage domain exactly.

## Contributing

Contributions are welcome! Please ensure:

- Code follows the existing style (Prettier, ESLint)
- All tests pass
- New features include tests
- Documentation is updated

## License

See the root [LICENSE](../../LICENSE) file for details.
