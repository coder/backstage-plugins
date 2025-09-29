# Coder OAuth Provider for Backstage

This implementation provides OAuth authentication integration between Backstage and Coder deployments, allowing users to authenticate using their Coder credentials.

## Features

- **OAuth 2.0 Flow**: Complete implementation of OAuth authorization code flow
- **Multi-Deployment Support**: Configure different OAuth apps for different Coder deployments
- **Token Management**: Full token lifecycle including refresh and revocation
- **Multiple Resolvers**: Several built-in user identity resolvers
- **Error Handling**: Comprehensive error handling and logging
- **Security**: State parameter validation, token expiration, and secure token storage

## Setup

### 1. Configure OAuth App in Coder

First, create an OAuth application in your Coder deployment:

1. Access your Coder deployment as an admin
2. Go to **Admin** → **OAuth Applications**
3. Click **Create OAuth App**
4. Configure the application:
   - **Name**: `Backstage Authentication`
   - **Redirect URI**: `http://localhost:7007/api/auth/coder/handler/frame` (adjust for your backend URL)
   - **Scopes**: `all` (or customize as needed)
5. Save the **Client ID** and **Client Secret**

### 2. Configure Backstage

Add the Coder OAuth provider to your `app-config.yaml`:

```yaml
auth:
  providers:
    coder:
      # Global configuration (applies to all Coder deployments)
      clientId: ${CODER_OAUTH_CLIENT_ID}
      clientSecret: ${CODER_OAUTH_CLIENT_SECRET}
      
      # Per-deployment configuration (optional)
      dev.coder.com:
        clientId: ${DEV_CODER_CLIENT_ID}
        clientSecret: ${DEV_CODER_CLIENT_SECRET}
      prod.coder.com:
        clientId: ${PROD_CODER_CLIENT_ID}
        clientSecret: ${PROD_CODER_CLIENT_SECRET}
```

### 3. Set Environment Variables

Set the required environment variables:

```bash
# Global credentials
export CODER_OAUTH_CLIENT_ID="your-client-id"
export CODER_OAUTH_CLIENT_SECRET="your-client-secret"

# Per-deployment credentials (if using)
export DEV_CODER_CLIENT_ID="dev-client-id"
export DEV_CODER_CLIENT_SECRET="dev-client-secret"
```

### 4. Update CORS Configuration

Ensure your Coder deployments are allowed in CORS:

```yaml
backend:
  cors:
    origin:
      - http://localhost:3000
      - https://your-coder-deployment.com
```

## Usage

### Authentication Flow

1. User clicks "Sign in with Coder" in Backstage
2. User provides their Coder deployment URL
3. User is redirected to their Coder deployment for authentication
4. After successful authentication, user is redirected back to Backstage
5. Backstage exchanges the authorization code for access tokens
6. User profile is fetched from Coder API
7. User is signed into Backstage with their Coder identity

### Available Resolvers

The provider includes several built-in resolvers:

#### 1. Email Matching Resolver

```typescript
coder: coder.create({
  signIn: {
    resolver: coder.resolvers.emailMatchingUserEntityAnnotation(),
  },
})
```

Matches users by email address with User entities in the catalog.

#### 2. Username Matching Resolver

```typescript
coder: coder.create({
  signIn: {
    resolver: coder.resolvers.usernameMatchingUserEntityName(),
  },
})
```

Matches users by Coder username with User entity names.

#### 3. Custom Resolver

```typescript
coder: coder.create({
  signIn: {
    resolver: coder.resolvers.customResolver(),
  },
})
```

Uses email domain to determine user namespace (e.g., `user@acme.com` → `user:acme/username`).

#### 4. Custom Implementation

```typescript
coder: coder.create({
  signIn: {
    resolver: async (info, ctx) => {
      const { result } = info;
      const { fullProfile } = result;
      
      // Your custom logic here
      return ctx.issueToken({
        claims: {
          sub: `user:default/${fullProfile.username}`,
          ent: [`user:default/${fullProfile.username}`],
        },
      });
    },
  },
})
```

## API Endpoints

The provider implements the standard Backstage auth endpoints:

- `GET /api/auth/coder/start?coder_url=https://your-coder.com` - Start OAuth flow
- `GET /api/auth/coder/handler/frame` - OAuth callback handler
- `POST /api/auth/coder/refresh` - Refresh access token
- `POST /api/auth/coder/logout` - Logout and revoke tokens

## Configuration Options

### Per-Deployment Configuration

You can configure different OAuth applications for different Coder deployments:

```yaml
auth:
  providers:
    coder:
      # Configuration for dev.coder.com
      dev.coder.com:
        clientId: ${DEV_CODER_CLIENT_ID}
        clientSecret: ${DEV_CODER_CLIENT_SECRET}
      
      # Configuration for prod.coder.com
      prod.coder.com:
        clientId: ${PROD_CODER_CLIENT_ID}
        clientSecret: ${PROD_CODER_CLIENT_SECRET}
      
      # Fallback global configuration
      clientId: ${GLOBAL_CODER_CLIENT_ID}
      clientSecret: ${GLOBAL_CODER_CLIENT_SECRET}
```

### Custom Auth Handler

Customize how Coder profiles are transformed:

```typescript
coder: coder.create({
  authHandler: async ({ fullProfile }) => {
    return {
      profile: {
        email: fullProfile.email,
        displayName: `${fullProfile.name} (${fullProfile.username})`,
        picture: fullProfile.avatar_url,
      },
    };
  },
  signIn: {
    resolver: coder.resolvers.usernameMatchingUserEntityName(),
  },
})
```

## Security Considerations

- **State Validation**: The provider validates OAuth state parameters to prevent CSRF attacks
- **Token Expiration**: Access tokens are properly managed with refresh capabilities
- **Secure Storage**: Tokens are handled securely and can be revoked
- **HTTPS**: Always use HTTPS in production deployments
- **CORS**: Properly configure CORS to only allow trusted origins

## Troubleshooting

### Common Issues

1. **"Missing OAuth client ID"**
   - Ensure environment variables are set correctly
   - Check configuration key names match your deployment hostname

2. **"Token exchange failed"**
   - Verify OAuth app redirect URI matches exactly
   - Check client secret is correct
   - Ensure Coder deployment is accessible

3. **"Invalid or expired access token"**
   - Token may have expired, refresh should be handled automatically
   - Check if OAuth app has required scopes

4. **CORS errors**
   - Add your Coder deployment URL to backend CORS configuration
   - Ensure frontend and backend URLs are properly configured

### Debug Logging

The provider includes comprehensive logging. Check your Backstage backend logs for:

- OAuth flow initiation
- Token exchange details
- User profile fetching
- Error details

## Coder API Endpoints Used

The implementation uses these Coder API endpoints:

- `GET /oauth2/authorize` - OAuth authorization
- `POST /oauth2/token` - Token exchange and refresh
- `GET /api/v2/users/me` - User profile
- `POST /oauth2/tokens/revoke` - Token revocation

## Development

### Testing the Implementation

1. Start your Backstage backend in development mode
2. Navigate to `http://localhost:3000`
3. Try signing in with the Coder provider
4. Provide your Coder deployment URL when prompted
5. Complete the OAuth flow

### Extending the Provider

The provider is designed to be extensible:

- Add custom resolvers for different user matching strategies
- Implement custom auth handlers for profile transformation
- Add additional configuration options as needed
- Extend error handling for specific use cases
