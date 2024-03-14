import React from 'react';
import { useDevcontainers } from '../../hooks/useDevcontainers';
import { InfoCard } from '@backstage/core-components';
import { VisuallyHidden } from '../VisuallyHidden';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(() => ({
  link: {
    textDecoration: 'underline',
    '&:hover': {
      textDecoration: 'none',
    },
  },
  tagName: {
    fontWeight: 700,
  },
}));

export const ExampleDevcontainersComponent = () => {
  const state = useDevcontainers();
  const styles = useStyles();

  return (
    <InfoCard title="Devcontainers plugin">
      <p>
        Searched component entity for tag:{' '}
        <span className={styles.tagName}>{state.tagName}</span>
      </p>

      {state.hasUrl ? (
        <>
          <p>Your entity supports dev containers!</p>
          <a href={state.vsCodeUrl} className={styles.link}>
            Click here to launch VSCode
            <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
          </a>
        </>
      ) : (
        <p>No dev containers plugin tag detected</p>
      )}
    </InfoCard>
  );
};
