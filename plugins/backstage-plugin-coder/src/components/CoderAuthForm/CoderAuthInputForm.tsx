import React, { type FormEvent, useState, useEffect } from 'react';
import { useId } from '../../hooks/hookPolyfills';
import {
  type CoderAuthStatus,
  useCoderAppConfig,
  useInternalCoderAuth,
} from '../CoderProvider';

import { CoderLogo } from '../CoderLogo';
import { Link, LinkButton } from '@backstage/core-components';
import { VisuallyHidden } from '../VisuallyHidden';
import { makeStyles } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import ErrorIcon from '@material-ui/icons/ErrorOutline';
import SyncIcon from '@material-ui/icons/Sync';

const useStyles = makeStyles(theme => ({
  formContainer: {
    maxWidth: '30em',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  authInputFieldset: {
    display: 'flex',
    flexFlow: 'column nowrap',
    rowGap: theme.spacing(2),
    margin: `${theme.spacing(-0.5)} 0 0 0`,
    border: 'none',
    padding: 0,
  },

  coderLogo: {
    display: 'block',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  authButton: {
    display: 'block',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  oauthSection: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },

  oauthButton: {
    display: 'block',
    width: '100%',
    maxWidth: '100%',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),

    '&::before, &::after': {
      content: '""',
      flex: 1,
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },

  dividerText: {
    padding: `0 ${theme.spacing(1)}px`,
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
}));

export const CoderAuthInputForm = () => {
  const hookId = useId();
  const styles = useStyles();
  const appConfig = useCoderAppConfig();
  const { status, registerNewToken } = useInternalCoderAuth();

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Verify the message is from our OAuth callback backend
      const backendUrl = appConfig.oauth?.backendUrl;

      // If backendUrl is configured, verify the origin matches
      if (backendUrl) {
        const backendOrigin = new URL(backendUrl).origin;
        if (event.origin !== backendOrigin) {
          return;
        }
      }

      if (event.data?.type === 'coder-oauth-success' && event.data?.token) {
        registerNewToken(event.data.token);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [registerNewToken, appConfig.oauth?.backendUrl]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const newToken =
      typeof formData.authToken === 'string' ? formData.authToken : '';

    registerNewToken(newToken);
  };

  const handleOAuthLogin = () => {
    const authUrl = `${appConfig.deployment.accessUrl}/oauth2/authorize`;
    const clientId = appConfig.oauth?.clientId || 'backstage';
    const backendUrl =
      appConfig.oauth?.backendUrl ||
      `${window.location.protocol}//${window.location.hostname}:7007`;
    const redirectUri = `${backendUrl}/api/auth/coder/oauth/callback`;
    const state = btoa(JSON.stringify({ returnTo: window.location.pathname }));

    const oauthUrl = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code&state=${state}`;

    // Open OAuth flow in popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      oauthUrl,
      'Coder OAuth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`,
    );
  };

  const formHeaderId = `${hookId}-form-header`;
  const legendId = `${hookId}-legend`;
  const authTokenInputId = `${hookId}-auth-token`;
  const warningBannerId = `${hookId}-warning-banner`;

  return (
    <form
      aria-labelledby={formHeaderId}
      className={styles.formContainer}
      onSubmit={onSubmit}
    >
      <h3 hidden id={formHeaderId}>
        Authenticate with Coder
      </h3>

      <div>
        <CoderLogo className={styles.coderLogo} />
        <p>Link your Coder account to create remote workspaces.</p>
      </div>

      <div className={styles.oauthSection}>
        <LinkButton
          disableRipple
          to=""
          component="button"
          type="button"
          color="primary"
          variant="contained"
          className={styles.oauthButton}
          onClick={handleOAuthLogin}
        >
          Sign in with Coder
        </LinkButton>
      </div>

      <div className={styles.divider}>
        <span className={styles.dividerText}>OR</span>
      </div>

      <p>
        Alternatively, enter a token from your{' '}
        <Link to={`${appConfig.deployment.accessUrl}/cli-auth`} target="_blank">
          Coder deployment's token page
          <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
        </Link>
        .
      </p>

      <fieldset className={styles.authInputFieldset} aria-labelledby={legendId}>
        <legend hidden id={legendId}>
          Auth input
        </legend>

        <TextField
          // Adding the label prop directly to the TextField will place a label
          // in the HTML, so sighted users are fine. But for some reason, it
          // won't connect the label and input together, which breaks
          // accessibility for screen readers. Need to wire up extra IDs, sadly.
          label="Auth token"
          InputLabelProps={{ htmlFor: authTokenInputId }}
          InputProps={{ id: authTokenInputId }}
          required
          name="authToken"
          type="password"
          defaultValue=""
          aria-errormessage={warningBannerId}
          style={{ width: '100%' }}
        />

        <LinkButton
          disableRipple
          to=""
          component="button"
          type="submit"
          color="primary"
          variant="contained"
          className={styles.authButton}
        >
          Authenticate
        </LinkButton>
      </fieldset>

      {(status === 'invalid' || status === 'authenticating') && (
        <InvalidStatusNotifier authStatus={status} bannerId={warningBannerId} />
      )}
    </form>
  );
};

const useInvalidStatusStyles = makeStyles(theme => ({
  warningBannerSpacer: {
    paddingTop: theme.spacing(2),
  },

  warningBanner: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    border: `1.5px solid ${theme.palette.background.default}`,
    padding: 0,
  },

  errorContent: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    columnGap: theme.spacing(1),
    marginRight: 'auto',

    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    paddingLeft: theme.spacing(2),
    paddingRight: 0,
  },

  icon: {
    fontSize: '16px',
  },

  syncIcon: {
    color: theme.palette.text.primary,
    opacity: 0.6,
  },

  errorIcon: {
    color: theme.palette.error.main,
    fontSize: '16px',
  },

  dismissButton: {
    border: 'none',
    alignSelf: 'stretch',
    padding: `0 ${theme.spacing(1.5)}px 0 ${theme.spacing(2)}px`,
    color: theme.palette.text.primary,
    backgroundColor: 'inherit',
    lineHeight: 1,
    cursor: 'pointer',

    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },

  '@keyframes spin': {
    '100%': {
      transform: 'rotate(360deg)',
    },
  },
}));

type InvalidStatusProps = Readonly<{
  authStatus: CoderAuthStatus;
  bannerId: string;
}>;

function InvalidStatusNotifier({ authStatus, bannerId }: InvalidStatusProps) {
  const [showNotification, setShowNotification] = useState(true);
  const styles = useInvalidStatusStyles();

  if (!showNotification) {
    return null;
  }

  return (
    <div className={styles.warningBannerSpacer}>
      <div id={bannerId} className={styles.warningBanner}>
        <span className={styles.errorContent}>
          {authStatus === 'authenticating' && (
            <>
              <SyncIcon
                className={`${styles.icon} ${styles.syncIcon}`}
                // Needed to make MUI v4 icons respect sizing values
                fontSize="inherit"
              />
              Authenticating&hellip;
            </>
          )}

          {authStatus === 'invalid' && (
            <>
              <ErrorIcon
                className={`${styles.icon} ${styles.errorIcon}`}
                fontSize="inherit"
              />
              Invalid token
            </>
          )}
        </span>

        <button
          className={styles.dismissButton}
          onClick={() => setShowNotification(false)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
