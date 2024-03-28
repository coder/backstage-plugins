import React, { FormEvent } from 'react';
import { useId } from '../../hooks/hookPolyfills';
import {
  type CoderAuthStatus,
  useCoderAppConfig,
  useCoderAuth,
} from '../CoderProvider';

import { Theme, makeStyles } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import { CoderLogo } from '../CoderLogo';
import { Link, LinkButton } from '@backstage/core-components';
import { VisuallyHidden } from '../VisuallyHidden';

type UseStyleInput = Readonly<{ status: CoderAuthStatus }>;
type StyleKeys =
  | 'formContainer'
  | 'authInputFieldset'
  | 'coderLogo'
  | 'authButton'
  | 'warningBanner'
  | 'warningBannerContainer';

const useStyles = makeStyles<Theme, UseStyleInput, StyleKeys>(theme => ({
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

  warningBannerContainer: {
    paddingTop: theme.spacing(4),
    paddingLeft: theme.spacing(6),
    paddingRight: theme.spacing(6),
  },

  warningBanner: ({ status }) => {
    let color: string;
    let backgroundColor: string;

    if (status === 'invalid') {
      color = theme.palette.error.contrastText;
      backgroundColor = theme.palette.banner.error;
    } else {
      color = theme.palette.text.primary;
      backgroundColor = theme.palette.background.default;
    }

    return {
      color,
      backgroundColor,
      borderRadius: theme.shape.borderRadius,
      textAlign: 'center',
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
    };
  },
}));

export const CoderAuthInputForm = () => {
  const hookId = useId();
  const appConfig = useCoderAppConfig();
  const { status, registerNewToken } = useCoderAuth();
  const styles = useStyles({ status });

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
        <div className={styles.warningBannerContainer}>
          <div id={warningBannerId} className={styles.warningBanner}>
            {status === 'invalid' && 'Invalid token'}
            {status === 'authenticating' && <>Authenticating&hellip;</>}
          </div>
        </div>
      )}
    </form>
  );
};
