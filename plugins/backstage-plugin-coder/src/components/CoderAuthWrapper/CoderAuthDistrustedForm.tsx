import React from 'react';
import { CoderLogo } from '../CoderLogo';
import { LinkButton } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';
import { useCoderAuth } from '../CoderProvider';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'center',
    maxWidth: '30em',
    marginLeft: 'auto',
    marginRight: 'auto',
    rowGap: theme.spacing(2),
  },

  button: {
    maxWidth: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  coderLogo: {
    display: 'block',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
}));

export const CoderAuthDistrustedForm = () => {
  const styles = useStyles();
  const auth = useCoderAuth();

  return (
    <div className={styles.root}>
      <div>
        <CoderLogo className={styles.coderLogo} />
        <p>
          Unable to verify token authenticity. Please check your internet
          connection, or try ejecting the token.
        </p>
      </div>

      <LinkButton
        disableRipple
        to=""
        component="button"
        type="submit"
        color="primary"
        variant="contained"
        className={styles.button}
        onClick={auth.type === 'token' ? auth.ejectToken : undefined}
      >
        Eject token
      </LinkButton>
    </div>
  );
};
