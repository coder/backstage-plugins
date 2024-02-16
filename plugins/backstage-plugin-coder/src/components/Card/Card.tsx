import React, { type HTMLAttributes, forwardRef } from 'react';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  root: {
    color: theme.palette.type,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },
}));

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const { className, ...delegatedProps } = props;
  const styles = useStyles();

  return (
    <div
      ref={ref}
      className={`${styles.root} ${className ?? ''}`}
      {...delegatedProps}
    />
  );
});
