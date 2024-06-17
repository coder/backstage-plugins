import React from 'react';
import { CoderLogo } from '../CoderLogo';
import { makeStyles } from '@material-ui/core';
import { UnlinkAccountButton } from './UnlinkAccountButton';

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
  return (
    <div className={styles.root}>
      <div>
        <CoderLogo className={styles.coderLogo} />
        <p>
          Unable to verify token authenticity. Please check your internet
          connection, or try unlinking the token.
        </p>
      </div>

      <UnlinkAccountButton className={styles.button} />
    </div>
  );
};
