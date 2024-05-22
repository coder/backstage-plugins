import React from 'react';
import { A11yInfoCard, A11yInfoCardProps } from '../A11yInfoCard';
import { useInternalCoderAuth } from '../CoderProvider';
import {
  type CoderAuthFormProps,
  CoderAuthForm,
} from '../CoderAuthForm/CoderAuthForm';

type Props = A11yInfoCardProps & CoderAuthFormProps;

export function CoderAuthFormCardWrapper({
  children,
  headerContent,
  descriptionId,
  ...delegatedCardProps
}: Props) {
  const { isAuthenticated } = useInternalCoderAuth();

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
        <CoderAuthForm descriptionId={descriptionId} />
      )}
    </A11yInfoCard>
  );
}
