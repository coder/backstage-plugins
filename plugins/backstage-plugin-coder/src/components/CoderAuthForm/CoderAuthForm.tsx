import React from 'react';
import { useInternalCoderAuth } from '../CoderProvider';
import { CoderAuthDistrustedForm } from './CoderAuthDistrustedForm';
import { CoderAuthLoadingState } from './CoderAuthLoadingState';
import { CoderAuthInputForm } from './CoderAuthInputForm';
import { CoderAuthSuccessStatus } from './CoderAuthSuccessStatus';

export type CoderAuthFormProps = Readonly<{
  descriptionId?: string;
}>;

export const CoderAuthForm = ({ descriptionId }: CoderAuthFormProps) => {
  const auth = useInternalCoderAuth();

  return (
    <>
      {/*
       * By default this text will be inert, and not be exposed anywhere
       * (Sighted and blind users won't be able to interact with it). To enable
       * it for screen readers, a consuming component will need bind an ID to
       * another component via aria-describedby and then pass the same ID down
       * as props.
       */}
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
            return <CoderAuthSuccessStatus />;
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
