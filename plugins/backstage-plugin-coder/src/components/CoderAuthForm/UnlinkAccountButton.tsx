import type { ComponentProps } from 'react';
import { LinkButton } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';
import { useInternalCoderAuth } from '../CoderProvider';

type Props = Readonly<Omit<ComponentProps<typeof LinkButton>, 'to'>>;

const useStyles = makeStyles(() => ({
  root: {
    display: 'block',
    maxWidth: 'fit-content',
  },
}));

export function UnlinkAccountButton({
  className,
  onClick,
  type = 'button',
  ...delegatedProps
}: Props) {
  const styles = useStyles();
  const { unlinkToken } = useInternalCoderAuth();

  return (
    <LinkButton
      disableRipple
      to=""
      component="button"
      type={type}
      color="primary"
      variant="contained"
      className={`${styles.root} ${className}`}
      onClick={event => {
        unlinkToken();
        onClick?.(event);
      }}
      {...delegatedProps}
    >
      Unlink Coder account
    </LinkButton>
  );
}
