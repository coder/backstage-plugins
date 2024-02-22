import React, { type FC, type PropsWithChildren } from 'react';
import { useCoderAuth } from '../CoderProvider';
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
  const auth = useCoderAuth();
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
          case 'noInternetConnection': {
            return <CoderAuthDistrustedForm />;
          }

          case 'authenticating':
          case 'invalid':
          case 'tokenMissing': {
            return <CoderAuthInputForm />;
          }

          case 'authenticated':
          case 'distrustedWithGracePeriod': {
            throw new Error(
              'This code should be unreachable because of the auth check near the start of the component',
            );
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
