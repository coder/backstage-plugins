import React, { type FC, type PropsWithChildren } from 'react';
import { useCoderTokenAuth } from '../CoderProvider';
import { InfoCard } from '@backstage/core-components';
import { CoderAuthDistrustedForm } from './CoderAuthDistrustedForm';
import { makeStyles } from '@material-ui/core';
import { CoderAuthLoadingState } from './CoderAuthLoadingState';
import { CoderAuthInputForm } from './CoderAuthInputForm';

const useStyles = makeStyles(theme => ({
  cardContent: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(5),
  },
}));

function CoderAuthCard({ children }: PropsWithChildren<unknown>) {
  const styles = useStyles();
  return (
    <InfoCard title="Authenticate with Coder">
      <div className={styles.cardContent}>{children}</div>
    </InfoCard>
  );
}

type WrapperProps = Readonly<
  PropsWithChildren<{
    type: 'card';
  }>
>;

export const CoderAuthWrapper = ({ children, type }: WrapperProps) => {
  const auth = useCoderTokenAuth();
  if (auth.isAuthenticated) {
    return <>{children}</>;
  }

  let Wrapper: FC<PropsWithChildren<unknown>>;
  switch (type) {
    case 'card': {
      Wrapper = CoderAuthCard;
      break;
    }
    default: {
      assertExhaustion(type);
    }
  }

  return (
    <Wrapper>
      {/* Slightly awkward syntax with the IIFE, but need something switch-like
          to make sure that all status cases are handled exhaustively */}
      {(() => {
        switch (auth.status) {
          case 'initializing': {
            return <CoderAuthLoadingState />;
          }

          case 'distrusted':
          case 'noInternetConnection':
          case 'deploymentUnavailable': {
            return <CoderAuthDistrustedForm />;
          }

          case 'authenticating':
          case 'invalid':
          case 'tokenMissing': {
            return <CoderAuthInputForm />;
          }

          default: {
            return assertExhaustion(auth);
          }
        }
      })()}
    </Wrapper>
  );
};

function assertExhaustion(...inputs: readonly never[]): never {
  let inputsToLog: unknown;
  try {
    inputsToLog = JSON.stringify(inputs);
  } catch {
    inputsToLog = inputs;
  }

  throw new Error(
    `Not all possibilities for inputs (${inputsToLog}) have been exhausted`,
  );
}
