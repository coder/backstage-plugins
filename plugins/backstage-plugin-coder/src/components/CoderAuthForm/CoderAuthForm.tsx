import React, { type PropsWithChildren } from 'react';
import { useCoderAuth } from '../CoderProvider';
import { CoderAuthDistrustedForm } from './CoderAuthDistrustedForm';
import { CoderAuthLoadingState } from './CoderAuthLoadingState';
import { CoderAuthInputForm } from './CoderAuthInputForm';

type Props = Readonly<
  PropsWithChildren<{
    descriptionId?: string;
  }>
>;

export const CoderAuthForm = ({ descriptionId, children }: Props) => {
  const auth = useCoderAuth();
  if (auth.isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      <p id={descriptionId} hidden>
        Please authenticate with Coder to enable the Coder plugin for Backstage.
      </p>

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

          case 'authenticated':
          case 'distrustedWithGracePeriod': {
            throw new Error(
              'Tried to process authenticated user after main content should already be shown',
            );
          }

          default: {
            return assertExhaustion(auth);
          }
        }
      })()}
    </>
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
