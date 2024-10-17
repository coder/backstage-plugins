import React, { type HTMLAttributes, useState } from 'react';
import { useId } from '../../hooks/hookPolyfills';
import { makeStyles } from '@material-ui/core';
import { LinkButton } from '@backstage/core-components';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import { CoderAuthForm } from '../CoderAuthForm/CoderAuthForm';

const useStyles = makeStyles(theme => ({
  trigger: {
    cursor: 'pointer',
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
    width: 'fit-content',
    border: 'none',
    fontWeight: 600,
    borderRadius: theme.shape.borderRadius,
    transition: '10s color ease-in-out',
    padding: `${theme.spacing(1.5)}px ${theme.spacing(2)}px`,
    boxShadow: theme.shadows[10],

    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[15],
    },
  },

  dialogContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexFlow: 'column nowrap',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dialogPaper: {
    width: '100%',
  },

  dialogTitle: {
    fontSize: theme.typography.h5.fontSize ?? '24px',
    borderBottom: `${theme.palette.divider} 1px solid`,
    padding: `${theme.spacing(1)}px ${theme.spacing(3)}px`,
  },

  contentContainer: {
    padding: `${theme.spacing(6)}px ${theme.spacing(3)}px 0`,
  },

  actionsRow: {
    display: 'flex',
    flexFlow: 'row nowrap',
    justifyContent: 'center',
    padding: `${theme.spacing(1)}px ${theme.spacing(2)}px ${theme.spacing(
      6,
    )}px`,
  },

  closeButton: {
    // MUI's typography object doesn't expose any letter tracking values, even
    // though you need them to make sure that all-caps text doesn't bunch up.
    // Even if the text of the button changes, the styles might look slightly
    // wonky, but they won't cause any obvious readability/styling issues
    letterSpacing: '0.05em',
    padding: `${theme.spacing(0.5)}px ${theme.spacing(1)}px`,
    color: theme.palette.primary.main,

    '&:hover': {
      textDecoration: 'none',
    },
  },
}));

type DialogProps = Readonly<
  Omit<HTMLAttributes<HTMLButtonElement>, 'onClick' | 'className'> & {
    open?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    triggerClassName?: string;
  }
>;

export function CoderAuthFormDialog({
  children,
  onOpen,
  onClose,
  triggerClassName,
  open: outerIsOpen,
}: DialogProps) {
  const hookId = useId();
  const styles = useStyles();
  const [innerIsOpen, setInnerIsOpen] = useState(false);

  const handleClose = () => {
    setInnerIsOpen(false);
    onClose?.();
  };

  const isOpen = outerIsOpen ?? innerIsOpen;
  const titleId = `${hookId}-dialog-title`;
  const descriptionId = `${hookId}-dialog-description`;

  return (
    <>
      <button
        className={`${styles.trigger} ${triggerClassName ?? ''}`}
        onClick={() => {
          setInnerIsOpen(true);
          onOpen?.();
        }}
      >
        {children}
      </button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        classes={{
          container: styles.dialogContainer,
          paper: styles.dialogPaper,
        }}
      >
        <DialogTitle id={titleId} className={styles.dialogTitle}>
          Authenticate with Coder
        </DialogTitle>

        <DialogContent className={styles.contentContainer}>
          <CoderAuthForm descriptionId={descriptionId} />
        </DialogContent>

        <DialogActions className={styles.actionsRow}>
          <LinkButton
            to=""
            onClick={handleClose}
            className={styles.closeButton}
            disableRipple
          >
            Close
          </LinkButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
