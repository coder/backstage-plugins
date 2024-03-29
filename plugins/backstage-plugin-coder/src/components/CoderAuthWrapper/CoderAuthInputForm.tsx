import React, { useState, type FormEvent } from 'react';
import { useId } from '../../hooks/hookPolyfills';
import {
  type CoderAuthStatus,
  useCoderAppConfig,
  useCoderAuth,
} from '../CoderProvider';

import { CoderLogo } from '../CoderLogo';
import { Link, LinkButton } from '@backstage/core-components';
import { VisuallyHidden } from '../VisuallyHidden';
import { makeStyles, useTheme } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import ErrorIcon from '@material-ui/icons/ErrorOutline';

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
}));

export const CoderAuthInputForm = () => {
  const hookId = useId();
  const styles = useStyles();
  const appConfig = useCoderAppConfig();
  const { status: og, registerNewToken } = useCoderAuth();
  const status: typeof og = 'invalid';

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const newToken =
      typeof formData.authToken === 'string' ? formData.authToken : '';

    registerNewToken(newToken);
  };

  const legendId = `${hookId}-legend`;
  const authTokenInputId = `${hookId}-auth-token`;
  const warningBannerId = `${hookId}-warning-banner`;

  return (
    <form className={styles.formContainer} onSubmit={onSubmit}>
      <div>
        <CoderLogo className={styles.coderLogo} />
        <p>
          Link your Coder account to create remote workspaces. Please enter a
          new token from your{' '}
          <Link
            to={`${appConfig.deployment.accessUrl}/cli-auth`}
            target="_blank"
          >
            Coder deployment's token page
            <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
          </Link>
          .
        </p>
      </div>

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
    padding: 'none',
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

  errorIcon: {
    color: theme.palette.error.main,
    fontSize: '16px',
  },

  dismissButton: {
    border: 'none',
    padding: `${theme.spacing(0.5)}px ${theme.spacing(2)}px`,
    color: theme.palette.text.primary,
    backgroundColor: 'blue', // 'inherit',
    lineHeight: 1,
    cursor: 'pointer',
    height: '100%',

    '&:hover': {
      backgroundColor: 'pink', // theme.palette.action.hover,
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
          {authStatus === 'authenticating' && <>Authenticating&hellip;</>}
          {authStatus === 'invalid' && (
            <>
              <ErrorIcon className={styles.errorIcon} fontSize="inherit" />
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

type TempProps = Readonly<{ show: boolean }>;
function TempDebugComponent({ show }: TempProps) {
  const palette = useTheme().palette;
  if (!show) {
    return null;
  }

  const colorVisualizer = (() => {
    const visualizerEntries: [string, string][] = [];
    const pathStack: string[] = [];

    const traversePaletteValues = (current: NonNullable<unknown>): void => {
      for (const rawKey in current) {
        if (!current.hasOwnProperty(rawKey)) {
          continue;
        }

        const key = rawKey as keyof typeof current;
        const prop = current[key];

        if (typeof prop === 'string') {
          const pathValue =
            pathStack.length === 0
              ? `base/${key}`
              : `${pathStack.join('/')}/${key}`;

          visualizerEntries.push([pathValue, prop]);
          continue;
        }

        if (prop === null || typeof prop !== 'object') {
          continue;
        }

        pathStack.push(key);
        traversePaletteValues(prop);
        pathStack.pop();
      }
    };

    traversePaletteValues(palette);
    return visualizerEntries;
  })();

  return (
    <>
      {colorVisualizer.map(([path, color], i) => (
        <div key={i} style={{ paddingTop: '1rem' }}>
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              backgroundColor: color,
            }}
          />
          <span style={{ paddingLeft: '0.5rem' }}>{path}</span>
        </div>
      ))}
    </>
  );
}
