import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import axios from 'axios';

export interface RouterOptions {
  logger: Logger;
  config: Config;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = Router();
  router.use(express.json());

  // OAuth callback endpoint
  router.get('/oauth/callback', async (req, res) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      logger.error('OAuth callback missing authorization code');
      res.status(400).send('Missing authorization code');
      return;
    }

    try {
      // Get Coder configuration from coder.oauth
      const coderConfig = config.getOptionalConfig('coder');

      const accessUrl = coderConfig?.getString('deployment.accessUrl') || '';
      const clientId = coderConfig?.getString('oauth.clientId') || 'backstage';
      const clientSecret = coderConfig?.getString('oauth.clientSecret') || '';
      const redirectUri = `${req.protocol}://${req.get(
        'host',
      )}/api/auth/coder/oauth/callback`;

      // Exchange authorization code for access token
      const tokenResponse = await axios.post(
        `${accessUrl}/oauth2/tokens`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token } = tokenResponse.data;

      // Return HTML that sends the token to the opener window via postMessage
      res.setHeader('Content-Security-Policy', "script-src 'unsafe-inline'");
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Successful</title>
          </head>
          <body>
            <p>Authentication successful! This window will close automatically...</p>
            <script>
              (function() {
                // Send token to opener window via postMessage
                if (window.opener) {
                  var targetOrigin;
                  try {
                    // Try to get the opener's origin
                    targetOrigin = window.opener.location.origin;
                  } catch (e) {
                    // If we can't access it due to cross-origin, use wildcard
                    // This is safe since we're only sending to our own opener
                    targetOrigin = '*';
                  }
                  
                  window.opener.postMessage(
                    { type: 'coder-oauth-success', token: '${access_token}' },
                    targetOrigin
                  );
                  setTimeout(function() { window.close(); }, 500);
                } else {
                  document.body.innerHTML = '<p>Authentication successful! You can close this window.</p>';
                }
              })();
            </script>
          </body>
        </html>
      `);

      logger.info('OAuth authentication successful');
      return;
    } catch (error) {
      logger.error('OAuth token exchange failed', error);
      res
        .status(500)
        .send(
          `<html><body><h1>Authentication failed</h1><p>${
            error instanceof Error ? error.message : 'Unknown error'
          }</p></body></html>`,
        );
      return;
    }
  });

  router.get('/health', (_, response) => {
    logger.info('Health check');
    response.json({ status: 'ok' });
  });

  router.use(errorHandler());
  return router;
}
