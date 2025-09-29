import {
  createAuthProviderIntegration,
  AuthHandler,
  SignInResolver,
  AuthResolverContext,
  AuthProviderRouteHandlers,
  postMessageResponse,
  WebMessageResponse,
} from '@backstage/plugin-auth-backend';
import * as express from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { ProfileInfo, SignInInfo } from '@backstage/plugin-auth-node';

/**
 * OAuth provider integration for Coder deployments.
 * This allows users to authenticate using their Coder deployment as an OAuth provider.
 */

export interface CoderAuthProviderOptions {
  /**
   * The profile transformation function, receives the full profile object from OAuth.
   */
  authHandler?: AuthHandler<CoderOAuthResult>;

  /**
   * Configure sign-in for this provider, without it the provider can not be used to sign users in.
   */
  signIn?: {
    /**
     * Maps an auth result to a Backstage identity for the user.
     */
    resolver: SignInResolver<CoderOAuthResult>;
  };
}

export interface CoderOAuthResult {
  fullProfile: CoderProfile;
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
}

export interface CoderProfile {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

/**
 * Token response from Coder OAuth endpoint
 */
interface CoderTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

/**
 * User profile response from Coder API
 */
interface CoderUserResponse {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  status: string;
  roles: Array<{
    name: string;
    display_name: string;
  }>;
}

class CoderAuthProvider implements AuthProviderRouteHandlers {
  private readonly authHandler: AuthHandler<CoderOAuthResult>;
  private readonly signInResolver?: SignInResolver<CoderOAuthResult>;
  private readonly logger: LoggerService;
  private readonly config: Config;
  private readonly appOrigin: string;

  constructor(
    options: CoderAuthProviderOptions,
    logger: LoggerService,
    config: Config,
  ) {
    this.authHandler = options.authHandler || this.defaultAuthHandler;
    this.signInResolver = options.signIn?.resolver;
    this.logger = logger;
    this.config = config;
    this.appOrigin = config.getString('app.baseUrl');
  }

  async start(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    const coderUrl = req.query.coder_url as string;
    
    if (!coderUrl) {
      throw new Error('Missing required parameter: coder_url');
    }

    // Validate the Coder URL format
    try {
      new URL(coderUrl);
    } catch {
      throw new Error('Invalid coder_url format');
    }

    // Store the state in the session/query for the callback
    const state = Buffer.from(
      JSON.stringify({
        nonce: Math.random().toString(36),
        coder_url: coderUrl,
        env: 'development', // This would be configurable in a real implementation
        timestamp: Date.now(),
      })
    ).toString('base64');

    const clientId = this.getClientId(coderUrl);
    const redirectUri = this.getRedirectUri();
    
    // OAuth 2.0 authorization URL for Coder
    const authorizationUrl = new URL(`${coderUrl}/oauth2/authorize`);
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'all'); // Coder typically uses 'all' scope
    authorizationUrl.searchParams.set('state', state);

    this.logger.info(
      `Redirecting to Coder OAuth: ${authorizationUrl.toString()}`,
    );

    res.redirect(authorizationUrl.toString());
  }

  async frameHandler(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    try {
      const { code, state, error } = req.query;

      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state');
      }

      // Decode state
      const decodedState = JSON.parse(
        Buffer.from(state as string, 'base64').toString()
      );
      const coderUrl = decodedState.coder_url;

      // Validate state timestamp to prevent replay attacks
      if (Date.now() - decodedState.timestamp > 600000) { // 10 minutes
        throw new Error('State parameter has expired');
      }

      // Exchange code for tokens
      const tokenResult = await this.exchangeCodeForTokens(
        code as string,
        coderUrl,
      );

      // Get user profile
      const profile = await this.getUserProfile(
        tokenResult.access_token,
        coderUrl,
      );

      const result: CoderOAuthResult = {
        fullProfile: profile,
        accessToken: tokenResult.access_token,
        refreshToken: tokenResult.refresh_token,
        expiresInSeconds: tokenResult.expires_in,
      };

      const { profile: transformedProfile } = await this.authHandler(
        result,
        {} as AuthResolverContext, // Stub for now
      );

      const response: WebMessageResponse = {
        type: 'authorization_response' as const,
        response: {
          profile: transformedProfile,
          providerInfo: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresInSeconds: result.expiresInSeconds,
          },
        },
      };

      return postMessageResponse(res, this.appOrigin, response);
    } catch (error) {
      this.logger.error('Error in Coder OAuth frame handler:', error);
      
      const errorResponse: WebMessageResponse = {
        type: 'authorization_response' as const,
        error: error instanceof Error ? error : new Error('Authentication failed'),
      };

      return postMessageResponse(res, this.appOrigin, errorResponse);
    }
  }

  async refresh(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    try {
      const { refreshToken, coderUrl } = req.body;
      
      if (!refreshToken || !coderUrl) {
        res.status(400).json({ 
          error: 'Missing required parameters: refreshToken and coderUrl' 
        });
        return;
      }

      const clientId = this.getClientId(coderUrl);
      const clientSecret = this.getClientSecret(coderUrl);
      const tokenUrl = `${coderUrl}/oauth2/token`;
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Backstage-Coder-Auth-Plugin',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Token refresh failed: ${response.status} ${errorText}`);
        res.status(response.status).json({ 
          error: `Token refresh failed: ${errorText}` 
        });
        return;
      }

      const tokenData: CoderTokenResponse = await response.json();
      
      res.json({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresInSeconds: tokenData.expires_in,
        tokenType: tokenData.token_type,
      });
    } catch (error) {
      this.logger.error('Token refresh error:', error);
      res.status(500).json({ 
        error: 'Internal server error during token refresh' 
      });
    }
  }

  async logout(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    try {
      const { accessToken, coderUrl } = req.body;
      
      if (accessToken && coderUrl) {
        // Attempt to revoke the token with Coder
        try {
          const revokeUrl = `${coderUrl}/oauth2/tokens/revoke`;
          const revokeResponse = await fetch(revokeUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Backstage-Coder-Auth-Plugin',
            },
            body: new URLSearchParams({
              token: accessToken,
              token_type_hint: 'access_token',
            }).toString(),
          });

          if (!revokeResponse.ok) {
            this.logger.warn(`Token revocation returned status ${revokeResponse.status}`);
          } else {
            this.logger.info('Successfully revoked Coder access token');
          }
        } catch (error) {
          // Log but don't fail the logout if token revocation fails
          this.logger.warn('Failed to revoke token during logout:', error);
        }
      }
      
      res.json({ 
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    coderUrl: string,
  ): Promise<CoderTokenResponse> {
    const clientId = this.getClientId(coderUrl);
    const clientSecret = this.getClientSecret(coderUrl);
    const redirectUri = this.getRedirectUri();
    
    const tokenUrl = `${coderUrl}/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    this.logger.info(`Exchanging code for tokens at ${tokenUrl}`);

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Backstage-Coder-Auth-Plugin',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Token exchange failed: ${response.status} ${errorText}`);
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData: CoderTokenResponse = await response.json();
      
      if (!tokenData.access_token) {
        throw new Error('Invalid token response: missing access_token');
      }

      this.logger.info('Successfully exchanged code for tokens');
      return tokenData;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  /**
   * Fetch user profile from Coder API
   */
  private async getUserProfile(
    accessToken: string,
    coderUrl: string,
  ): Promise<CoderProfile> {
    const userMeUrl = `${coderUrl}/api/v2/users/me`;
    
    this.logger.info(`Fetching user profile from ${userMeUrl}`);
    
    try {
      const response = await fetch(userMeUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Backstage-Coder-Auth-Plugin',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or expired access token');
        }
        const errorText = await response.text();
        this.logger.error(`Failed to fetch user profile: ${response.status} ${errorText}`);
        throw new Error(`Failed to fetch user profile: ${response.status} ${errorText}`);
      }

      const userData: CoderUserResponse = await response.json();
      
      const profile: CoderProfile = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        name: userData.name || userData.username,
        avatar_url: userData.avatar_url || `${coderUrl}/avatar/${userData.username}`,
      };

      this.logger.info(`Successfully fetched profile for user: ${profile.username}`);
      return profile;
    } catch (error) {
      this.logger.error('Failed to fetch user profile:', error);
      throw error;
    }
  }

  /**
   * Get OAuth client ID from configuration
   */
  private getClientId(coderUrl: string): string {
    // Support per-deployment client IDs or a global one
    const hostname = new URL(coderUrl).hostname;
    const clientId = this.config.getOptionalString(`auth.providers.coder.${hostname}.clientId`) ||
                     this.config.getOptionalString('auth.providers.coder.clientId');
    
    if (!clientId) {
      throw new Error(`Missing OAuth client ID for Coder deployment: ${coderUrl}. Configure auth.providers.coder.clientId or auth.providers.coder.${hostname}.clientId`);
    }
    
    return clientId;
  }

  /**
   * Get OAuth client secret from configuration
   */
  private getClientSecret(coderUrl: string): string {
    // Support per-deployment client secrets or a global one
    const hostname = new URL(coderUrl).hostname;
    const clientSecret = this.config.getOptionalString(`auth.providers.coder.${hostname}.clientSecret`) ||
                        this.config.getOptionalString('auth.providers.coder.clientSecret');
    
    if (!clientSecret) {
      throw new Error(`Missing OAuth client secret for Coder deployment: ${coderUrl}. Configure auth.providers.coder.clientSecret or auth.providers.coder.${hostname}.clientSecret`);
    }
    
    return clientSecret;
  }

  /**
   * Get the OAuth redirect URI
   */
  private getRedirectUri(): string {
    const backendUrl = this.config.getString('backend.baseUrl');
    return `${backendUrl}/api/auth/coder/handler/frame`;
  }

  /**
   * Default auth handler that transforms Coder profile to Backstage profile
   */
  private defaultAuthHandler: AuthHandler<CoderOAuthResult> = async ({
    fullProfile,
  }) => {
    return {
      profile: {
        email: fullProfile.email,
        displayName: fullProfile.name || fullProfile.username,
        picture: fullProfile.avatar_url,
      },
    };
  };
}

/**
 * Auth provider factory for Coder OAuth
 * This follows the correct pattern for Backstage auth provider integrations
 */
export const coder = createAuthProviderIntegration({
  create(options?: CoderAuthProviderOptions) {
    return ({ providerId, globalConfig, config, logger }) => {
      return new CoderAuthProvider(options || {}, logger, config);
    };
  },
  resolvers: {
    /**
     * Looks up the user by matching the email from Coder profile
     * with the User entity email annotation.
     */
    emailMatchingUserEntityAnnotation: (): SignInResolver<CoderOAuthResult> =>
      async (info, ctx) => {
        const { result } = info;
        const { fullProfile } = result;
        
        // This is a stub - in a real implementation, this would:
        // 1. Look up user entities in the catalog
        // 2. Match by email annotation
        // 3. Return the appropriate user reference
        
        return ctx.issueToken({
          claims: {
            sub: `user:default/${fullProfile.username}`,
            ent: [`user:default/${fullProfile.username}`],
          },
        });
      },

    /**
     * Looks up the user by matching the username from Coder profile
     * with the User entity name.
     */
    usernameMatchingUserEntityName: (): SignInResolver<CoderOAuthResult> =>
      async (info, ctx) => {
        const { result } = info;
        const { fullProfile } = result;
        
        return ctx.issueToken({
          claims: {
            sub: `user:default/${fullProfile.username}`,
            ent: [`user:default/${fullProfile.username}`],
          },
        });
      },

    /**
     * Custom resolver that allows more flexible user matching
     */
    customResolver: (): SignInResolver<CoderOAuthResult> =>
      async (info, ctx) => {
        const { result } = info;
        const { fullProfile } = result;
        
        // Example: Use email domain to determine organization
        const emailDomain = fullProfile.email.split('@')[1];
        const namespace = emailDomain.split('.')[0]; // e.g., 'acme' from 'user@acme.com'
        
        return ctx.issueToken({
          claims: {
            sub: `user:${namespace}/${fullProfile.username}`,
            ent: [`user:${namespace}/${fullProfile.username}`],
          },
        });
      },
  },
});
