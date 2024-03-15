import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core';
import { VisuallyHidden } from '../VisuallyHidden';

const useStyles = makeStyles(theme => ({
  button: {
    color: theme.palette.type,
    backgroundColor: theme.palette.background.paper,
    border: 'none',
    paddingTop: theme.spacing(2),
    fontSize: theme.typography.body2.fontSize,
    cursor: 'pointer',
  },

  snippet: {
    backgroundColor: theme.palette.grey[100],
    borderRadius: '0.4em',
  },
}));

export const DataReminder = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = useStyles();

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={styles.button}
      >
        {isExpanded ? '▼' : '►'}{' '}
        {isExpanded ? 'Hide text' : 'Why am I seeing all workspaces?'}
      </button>

      {isExpanded && (
        <p>
          This component displays all workspaces when the entity has no repo URL
          to filter by. Consider disabling{' '}
          <code className={styles.snippet}>readEntityData</code>;{' '}
          <a
            href="https://github.com/coder/backstage-plugins/blob/main/plugins/backstage-plugin-coder/docs/components.md#notes-4"
            rel="noopener noreferrer"
            target="_blank"
            style={{ textDecoration: 'underline', color: 'inherit' }}
          >
            details in our docs
            <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
          </a>
          .
        </p>
      )}
    </div>
  );
};
