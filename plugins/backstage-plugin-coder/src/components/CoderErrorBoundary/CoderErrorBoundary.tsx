import React, {
  type ErrorInfo,
  type FC,
  type ReactNode,
  Component,
} from 'react';

import { ValiError } from 'valibot';
import { errorApiRef, useApi } from '@backstage/core-plugin-api';

const FallbackUi = () => {
  return <p>Error encountered. Please check browser console.</p>;
};

type ErrorBoundaryCoreProps = {
  children?: ReactNode;
  fallbackUi: ReactNode;
  onError: (error: Error, componentStack: string) => void;
};

type ErrorBoundaryCoreState = {
  hasError: boolean;
};

// Have a slightly hokey setup - Error Boundaries are still only available via
// class components, but the best way to grab API values is via function
// components + hooks. Had to glue things together manually
class ErrorBoundaryCore extends Component<
  ErrorBoundaryCoreProps,
  ErrorBoundaryCoreState
> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  constructor(props: ErrorBoundaryCoreProps) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError(error, errorInfo.componentStack);
  }

  render() {
    const { children, fallbackUi } = this.props;
    return this.state.hasError ? fallbackUi : children;
  }
}

type CoderErrorBoundaryProps = {
  children?: ReactNode;
  fallbackUi?: ReactNode;
};

export const CoderErrorBoundary: FC<CoderErrorBoundaryProps> = ({
  children,
  fallbackUi,
}) => {
  const errorApi = useApi(errorApiRef);
  const fallbackContent = fallbackUi ?? <FallbackUi />;

  const onError = (error: Error, componentStack: string) => {
    // Not mutating original error, because I don't know if the error value is
    // used anywhere else in Backstage
    let errorToLog: Error;
    if (error instanceof ValiError) {
      const logs = error.issues.map(issue => issue.message).join(', ');
      errorToLog = new Error(logs);
    } else {
      errorToLog = new Error();
      errorToLog.message = error.message;
      errorToLog.name = error.name;
    }

    errorToLog.stack = `${
      error.stack ?? ''
    }\n\nReact Component stack:\n${componentStack}`;

    errorApi.post(errorToLog, {
      hidden: false,
    });
  };

  return (
    <ErrorBoundaryCore fallbackUi={fallbackContent} onError={onError}>
      {children}
    </ErrorBoundaryCore>
  );
};
