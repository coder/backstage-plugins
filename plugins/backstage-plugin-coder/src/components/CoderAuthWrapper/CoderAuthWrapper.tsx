import React, { type FC, type PropsWithChildren } from 'react';
import {
  type CoderAuth,
  type CoderAuthStatus,
  useCoderAuth,
  useCoderAppConfig,
} from '../CoderProvider';

import { LinkButton } from '@backstage/core-components';
import { VisuallyHidden } from '../VisuallyHidden';
import { Card } from '../Card';

type FormProps = Readonly<Pick<CoderAuth, 'registerNewToken' | 'status'>>;

const CoderAuthForm = ({ registerNewToken, status }: FormProps) => {
  const appConfig = useCoderAppConfig();

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        const formData = Object.fromEntries(new FormData(event.currentTarget));
        const newToken =
          typeof formData.authToken === 'string' ? formData.authToken : '';

        registerNewToken(newToken);
      }}
    >
      <p>PLACEHOLDER STYLING</p>
      <p>Status: {status}</p>

      <p>
        Your Coder session token is {mapAuthStatusToText(status)}. Please enter
        a new token from our{' '}
        <a
          href={`${appConfig.deployment.accessUrl}/cli-auth`}
          target="_blank"
          style={{
            color: 'hsl(185deg, 70%, 45%)',
            textDecoration: 'underline',
          }}
        >
          Token page
          <VisuallyHidden> (link opens in new tab)</VisuallyHidden>
        </a>
        .
      </p>

      <label>
        Auth token
        <input name="authToken" type="password" defaultValue="" />
      </label>

      <LinkButton
        component="button"
        to=""
        type="submit"
        variant="contained"
        style={{ display: 'block', marginTop: '1rem' }}
      >
        Authenticate
      </LinkButton>
    </form>
  );
};

type LayoutComponentProps = PropsWithChildren<unknown>;
function CoderAuthCard({ children }: LayoutComponentProps) {
  return <Card>{children}</Card>;
}

type WrapperProps = Readonly<
  PropsWithChildren<{
    type: 'card';
  }>
>;

export const CoderAuthWrapper = ({ children, type }: WrapperProps) => {
  const auth = useCoderAuth();
  if (auth.isAuthed) {
    return <>{children}</>;
  }

  let Wrapper: FC<PropsWithChildren<unknown>>;
  switch (type) {
    case 'card': {
      Wrapper = CoderAuthCard;
      break;
    }

    default: {
      throw new Error(
        `Unknown CoderAuthWrapper display type ${type} encountered`,
      );
    }
  }

  return (
    <Wrapper>
      {auth.status === 'initializing' ? (
        <p>Loading&hellip;</p>
      ) : (
        <CoderAuthForm
          status={auth.status}
          registerNewToken={auth.registerNewToken}
        />
      )}
    </Wrapper>
  );
};

function mapAuthStatusToText(status: CoderAuthStatus): string {
  switch (status) {
    case 'tokenMissing': {
      return 'missing';
    }

    case 'initializing':
    case 'reauthenticating': {
      return status;
    }

    default: {
      return 'invalid';
    }
  }
}
