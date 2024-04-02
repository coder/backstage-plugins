import React, { type HTMLAttributes, type ReactNode, useState } from 'react';
import { useId } from '../../hooks/hookPolyfills';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
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

    '&:not(:first-child)': {
      paddingTop: theme.spacing(6),
    },
  },
}));

export type DisclosureProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    isExpanded?: boolean;
    onExpansionToggle?: () => void;
    headerText: ReactNode;
  }
>;

export const Disclosure = ({
  isExpanded,
  onExpansionToggle,
  headerText,
  children,
  ...delegatedProps
}: DisclosureProps) => {
  const hookId = useId();
  const styles = useStyles();
  const [internalIsExpanded, setInternalIsExpanded] = useState(
    isExpanded ?? false,
  );

  const activeIsExpanded = isExpanded ?? internalIsExpanded;
  const disclosureBodyId = `${hookId}-disclosure-body`;

  // Might be worth revisiting the markup here to try implementing this
  // functionality with <detail> and <summary> elements. Would likely clean up
  // the component code a bit but might reduce control over screen reader output
  return (
    <div {...delegatedProps}>
      <button
        type="button"
        aria-expanded={activeIsExpanded}
        aria-controls={disclosureBodyId}
        className={styles.button}
        onClick={() => {
          setInternalIsExpanded(!internalIsExpanded);
          onExpansionToggle?.();
        }}
      >
        <span aria-hidden className={styles.disclosureTriangle}>
          {activeIsExpanded ? '▼' : '►'}
        </span>{' '}
        {headerText}
      </button>

      {activeIsExpanded && (
        <p id={disclosureBodyId} className={styles.disclosureBody}>
          {children}
        </p>
      )}
    </div>
  );
};
