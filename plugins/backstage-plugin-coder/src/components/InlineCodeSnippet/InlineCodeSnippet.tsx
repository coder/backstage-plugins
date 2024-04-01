import React, { HTMLAttributes } from 'react';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  root: {
    fontSize: theme.typography.body2.fontSize,
    color: theme.palette.text.primary,
    borderRadius: theme.spacing(0.5),
    padding: `${theme.spacing(0.2)}px ${theme.spacing(1)}px`,
    backgroundColor: () => {
      const isLightTheme = theme.palette.type === 'light';
      return isLightTheme
        ? 'hsl(0deg,0%,93%)'
        : theme.palette.background.default;
    },
  },
}));

type Props = Readonly<
  Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    children: string;
  }
>;

export function InlineCodeSnippet({ children, ...delegatedProps }: Props) {
  const styles = useStyles();
  return (
    <code className={styles.root} {...delegatedProps}>
      {children}
    </code>
  );
}
