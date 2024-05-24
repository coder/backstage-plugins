import React from 'react';
import { A11yInfoCard, A11yInfoCardProps } from '../A11yInfoCard';
import { useInternalCoderAuth } from '../CoderProvider';
import {
  type CoderAuthFormProps,
  CoderAuthForm,
} from '../CoderAuthForm/CoderAuthForm';
import { makeStyles } from '@material-ui/core';

type Props = A11yInfoCardProps & CoderAuthFormProps;

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(6),
    paddingBottom: theme.spacing(6),
  },
}));

export function CoderAuthFormCardWrapper({
  children,
  headerContent,
  descriptionId,
  ...delegatedCardProps
}: Props) {
  const { isAuthenticated } = useInternalCoderAuth();
  const styles = useStyles();

  return (
    <A11yInfoCard
      headerContent={
        // Can't wrap headerContent in Fragment in case headerContent should be
        // undefined when authenticated
        isAuthenticated ? headerContent : <>Authenticate with Coder</>
      }
      {...delegatedCardProps}
    >
      {isAuthenticated ? (
        <>{children}</>
      ) : (
        <div className={styles.root}>
          <CoderAuthForm descriptionId={descriptionId} />
        </div>
      )}
    </A11yInfoCard>
  );
}
