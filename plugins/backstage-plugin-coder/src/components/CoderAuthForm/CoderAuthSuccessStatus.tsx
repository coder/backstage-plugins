/**
 * @file In practice, this is a component that ideally shouldn't ever be seen by
 * the end user. Any component rendering out CoderAuthForm should ideally be set
 * up so that when a user is authenticated, the entire component will be
 * unmounted before CoderAuthForm has a chance to handle successful states.
 *
 * But just for the sake of completion (and to remove the risk of runtime render
 * errors), this component has been added to provide a form of double
 * book-keeping for the auth status switch checks in the parent component. Don't
 * want the entire plugin to blow up if an auth conditional in a different
 * component is accidentally set up wrong.
 */
import React from 'react';
import { makeStyles } from '@material-ui/core';
import { CoderLogo } from '../CoderLogo';
import { UnlinkAccountButton } from './UnlinkAccountButton';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'center',
    rowGap: theme.spacing(1),

    maxWidth: '30em',
    marginLeft: 'auto',
    marginRight: 'auto',
    color: theme.palette.text.primary,
    fontSize: theme.typography.body1.fontSize,
  },

  statusArea: {
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'center',
  },

  text: {
    textAlign: 'center',
    lineHeight: theme.typography.body1.fontSize,
  },
}));

export function CoderAuthSuccessStatus() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.statusArea}>
        <CoderLogo />
        <p className={styles.text}>You are fully authenticated with Coder.</p>
      </div>

      <UnlinkAccountButton />
    </div>
  );
}
