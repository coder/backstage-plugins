type TokenAuthStatusInfo = Readonly<
  | {
      status: 'initializing' | 'tokenMissing';
      token: undefined;
      error: undefined;
    }
  | {
      status: 'authenticated' | 'distrustedWithGracePeriod';
      token: string;
      error: undefined;
    }
  | {
      // Distrusted represents a token that could be valid, but we are unable to
      // verify it within an allowed window. invalid is definitely, 100% invalid
      status:
        | 'authenticating'
        | 'invalid'
        | 'distrusted'
        | 'noInternetConnection'
        | 'deploymentUnavailable';
      token: undefined;
      error: unknown;
    }
>;

export type CoderTokenAuthUiStatus = TokenAuthStatusInfo['status'];

export type CoderTokenUiAuth = Readonly<
  TokenAuthStatusInfo & {
    isAuthenticated: boolean;
    tokenLoadedOnMount: boolean;
    registerNewToken: (newToken: string) => void;
    ejectToken: () => void;
  }
>;
