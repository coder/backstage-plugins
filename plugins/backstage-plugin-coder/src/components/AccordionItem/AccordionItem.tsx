import React, { type PropsWithChildren, type ReactNode } from 'react';
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
  },
}));

type AccordionItemProps = Readonly<
  PropsWithChildren<{
    isExpanded: boolean;
    onExpansion: () => void;
    headerText: ReactNode;
  }>
>;

export const AccordionItem = ({
  isExpanded,
  onExpansion,
  headerText,
  children,
}: AccordionItemProps) => {
  const styles = useStyles();
  const hookId = useId();
  const disclosureBodyId = `${hookId}-disclosure-body`;

  // Might be worth revisiting the markup here to try implementing this
  // functionality with <detail> and <summary> elements. Would likely clean up
  // the component code a ton but might reduce control over screen reader output
  return (
    <div>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={disclosureBodyId}
        onClick={onExpansion}
        className={styles.button}
      >
        <span aria-hidden className={styles.disclosureTriangle}>
          {isExpanded ? '▼' : '►'}
        </span>{' '}
        {headerText}
      </button>

      {isExpanded && (
        <p id={disclosureBodyId} className={styles.disclosureBody}>
          {children}
        </p>
      )}
    </div>
  );
};
