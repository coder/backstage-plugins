import { Dialog, makeStyles } from '@material-ui/core';
import React, { type PropsWithChildren, useState } from 'react';

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

  dialog: {
    zIndex: 9999,
  },
}));

type DialogProps = Readonly<
  PropsWithChildren<{
    open?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    triggerClassName?: string;
    dialogClassName?: string;
  }>
>;

export function CoderAuthFormDialog({
  children,
  onOpen,
  onClose,
  triggerClassName,
  dialogClassName,
  open: outerIsOpen,
}: DialogProps) {
  const styles = useStyles();
  const [innerIsOpen, setInnerIsOpen] = useState(false);
  const isOpen = outerIsOpen ?? innerIsOpen;

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
        className={`${styles.dialog} ${dialogClassName ?? ''}`}
        onClose={() => {
          setInnerIsOpen(false);
          onClose?.();
        }}
      >
        Blah
      </Dialog>
    </>
  );
}
