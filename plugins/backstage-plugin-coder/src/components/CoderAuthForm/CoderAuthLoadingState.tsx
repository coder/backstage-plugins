import React, { useEffect, useState } from 'react';
import { CoderLogo } from '../CoderLogo';
import { makeStyles } from '@material-ui/core';
import { VisuallyHidden } from '../VisuallyHidden';

const MAX_DOTS = 3;
const dotRange = new Array(MAX_DOTS).fill(null).map((_, i) => i + 1);

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'center',
  },

  text: {
    lineHeight: theme.typography.body1.lineHeight,
    paddingLeft: theme.spacing(1),
  },

  coderLogo: {
    display: 'block',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
}));

export const CoderAuthLoadingState = () => {
  const [visibleDots, setVisibleDots] = useState(0);
  const styles = useStyles();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setVisibleDots(current => (current + 1) % (MAX_DOTS + 1));
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.root}>
      <CoderLogo className={styles.coderLogo} />
      <p className={styles.text}>
        Loading
        {/* Exposing the more semantic ellipses for screen readers, but
            rendering the individual dots for sighted viewers so that they can
            be animated */}
        <VisuallyHidden>&hellip;</VisuallyHidden>
        {dotRange.map(dotPosition => (
          <span
            key={dotPosition}
            style={{ opacity: visibleDots >= dotPosition ? 1 : 0 }}
            aria-hidden
          >
            .
          </span>
        ))}
      </p>
    </div>
  );
};
