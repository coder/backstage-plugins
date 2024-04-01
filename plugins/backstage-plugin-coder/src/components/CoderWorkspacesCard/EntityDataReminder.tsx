import React, { useState } from 'react';
import { useId } from '../../hooks/hookPolyfills';
import { Theme, makeStyles } from '@material-ui/core';
import { VisuallyHidden } from '../VisuallyHidden';
import { useWorkspacesCardContext } from './Root';

type UseStyleProps = Readonly<{
  hasData: boolean;
}>;

type UseStyleKeys =
  | 'root'
  | 'button'
  | 'disclosureTriangle'
  | 'disclosureBody'
  | 'snippet'
  | 'link';

const useStyles = makeStyles<Theme, UseStyleProps, UseStyleKeys>(theme => ({
  root: ({ hasData }) => ({
    paddingTop: theme.spacing(1),
    borderTop: hasData ? 'none' : `1px solid ${theme.palette.divider}`,
  }),

  link: {
    color: theme.palette.link,

    '&:hover': {
      textDecoration: 'underline',
    },
  },

  button: {
    width: '100%',
    textAlign: 'left',
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1),
    border: 'none',
    borderRadius: theme.shape.borderRadius,
    fontSize: theme.typography.body2.fontSize,
    cursor: 'pointer',

    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },

  disclosureTriangle: {
    display: 'inline-block',
    textAlign: 'right',
    width: theme.spacing(2.25),
    fontSize: '0.7rem',
  },

  disclosureBody: {
    margin: 0,
    padding: `${theme.spacing(0.5)}px ${theme.spacing(3.5)}px 0 ${theme.spacing(
      4,
    )}px`,
  },

  snippet: {
    color: theme.palette.text.primary,
    borderRadius: theme.spacing(0.5),
    padding: `${theme.spacing(0.2)}px ${theme.spacing(1)}px`,
    backgroundColor: () => {
      const defaultBackgroundColor = theme.palette.background.default;
      const isDefaultSpotifyLightTheme =
        defaultBackgroundColor.toUpperCase() === '#F8F8F8';

      return isDefaultSpotifyLightTheme
        ? 'hsl(0deg,0%,93%)'
        : defaultBackgroundColor;
    },
  },
}));

export const EntityDataReminder = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { workspacesQuery } = useWorkspacesCardContext();
  const styles = useStyles({ hasData: workspacesQuery.data !== undefined });

  const hookId = useId();
  const disclosureBodyId = `${hookId}-disclosure-body`;

  // Might be worth revisiting the markup here to try implementing this
  // functionality with <detail> and <summary> elements. Would likely clean up
  // the component code a ton but might reduce control over screen reader output
  return (
    <div className={styles.root}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={disclosureBodyId}
        onClick={() => setIsExpanded(!isExpanded)}
        className={styles.button}
      >
        <span aria-hidden className={styles.disclosureTriangle}>
          {isExpanded ? '▼' : '►'}
        </span>{' '}
        Why am I not seeing any workspaces?
      </button>

      {isExpanded && (
        <p id={disclosureBodyId} className={styles.disclosureBody}>
          This component displays only displays all workspaces when the value of
          the <code className={styles.snippet}>readEntityData</code> prop is{' '}
          <code className={styles.snippet}>false</code>. See{' '}
          <a
            href="https://github.com/coder/backstage-plugins/blob/main/plugins/backstage-plugin-coder/docs/components.md#notes-4"
            rel="noopener noreferrer"
            target="_blank"
            className={styles.link}
          >
            our documentation
            <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
          </a>{' '}
          for more info.
        </p>
      )}
    </div>
  );
};
