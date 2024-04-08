import { DiscoveryApi } from '@backstage/core-plugin-api';
import { defaultCoderClientConfigOptions } from './CoderClient';
import { BackstageHttpError } from './errors';
import { CoderAuthApi } from './Auth';
import { StateSnapshotManager } from '../utils/StateSnapshotManager';

type ConfigOptions = Readonly<{
  localStorage: typeof window.localStorage;
  localStorageKey: string;
  requestTimeoutMs: number;
  authTokenHeaderKey: string;
  apiPath: string;

  // Handles auth edge case where a previously-valid token can't be verified.
  // Not immediately removing token to provide better UX in case someone's
  // internet disconnects for a few seconds
  gracePeriodTimeoutMs: number;
}>;

export const defaultTokenAuthConfigOptions = {
  localStorage: window.localStorage,
  localStorageKey: 'coder-backstage-plugin/token',
  authTokenHeaderKey: 'Coder-Session-Token',
  gracePeriodTimeoutMs: 6_000,

  // Sharing config values with CoderClient to remove need for Auth class
  // instances to have an instance of the main CoderClient class
  apiPath: defaultCoderClientConfigOptions.apiRoutePrefix,
  requestTimeoutMs: defaultCoderClientConfigOptions.requestTimeoutMs,
} as const satisfies ConfigOptions;

export type AuthTokenStateSnapshot = Readonly<{
  currentToken: string;
  initialToken: string;
  isCurrentTokenValid: boolean;
  isInsideGracePeriod: boolean;
}>;

type SubscriptionCallback<TSnapshot = AuthTokenStateSnapshot> = (
  snapshot: TSnapshot,
) => void;

export interface CoderTokenAuthApi extends CoderAuthApi {
  readonly token: string;
  readonly initialToken: string;
  readonly isTokenValid: boolean;
  readonly isInsideGracePeriod: boolean;

  registerNewToken: (newToken: string) => void;
  clearToken: () => void;
  validateToken: (tokenToValidate: string) => Promise<boolean>;

  // Methods for syncing the Auth instance with other systems (main use case:
  // syncing it with React)
  subscribe: (callback: SubscriptionCallback) => () => void;
  unsubscribe: (callback: SubscriptionCallback) => void;
  getStateSnapshot: () => AuthTokenStateSnapshot;
}

export class CoderTokenAuth implements CoderTokenAuthApi {
  readonly initialToken: string;
  private readonly options: ConfigOptions;
  private readonly discoveryApi: DiscoveryApi;
  private readonly snapshotManager: StateSnapshotManager<AuthTokenStateSnapshot>;

  #token: string;
  #isTokenValid: boolean;
  #isInsideGracePeriod: boolean;
  #distrustGracePeriodTimeoutId: number | undefined;

  constructor(discoveryApi: DiscoveryApi, options?: Partial<ConfigOptions>) {
    this.discoveryApi = discoveryApi;
    this.options = { ...defaultTokenAuthConfigOptions, ...(options ?? {}) };

    this.initialToken = this.readTokenFromLocalStorage();
    this.#token = this.initialToken;
    this.#isTokenValid = false;
    this.#isInsideGracePeriod = true;
    this.#distrustGracePeriodTimeoutId = undefined;

    const initialSnapshot: AuthTokenStateSnapshot = {
      currentToken: this.#token,
      initialToken: this.initialToken,
      isCurrentTokenValid: this.#isTokenValid,
      isInsideGracePeriod: this.#isInsideGracePeriod,
    };

    this.snapshotManager = new StateSnapshotManager({ initialSnapshot });
  }

  static isInstance(value: unknown): value is CoderTokenAuth {
    return value instanceof CoderTokenAuth;
  }

  private async getApiEndpoint(): Promise<string> {
    const base = await this.discoveryApi.getBaseUrl('proxy');
    return `${base}${this.options.apiPath}`;
  }

  private readTokenFromLocalStorage(): string {
    const key = this.options.localStorageKey;
    return this.options.localStorage.getItem(key) ?? '';
  }

  private writeTokenToLocalStorage(): boolean {
    try {
      const key = this.options.localStorageKey;
      this.options.localStorage.setItem(key, this.#token);
      return true;
    } catch {
      return false;
    }
  }

  private flushStateChanges(): void {
    const newSnapshot: AuthTokenStateSnapshot = {
      currentToken: this.#token,
      initialToken: this.initialToken,
      isCurrentTokenValid: this.#isTokenValid,
      isInsideGracePeriod: this.#isInsideGracePeriod,
    };

    this.snapshotManager.updateSnapshot(newSnapshot);
  }

  private setToken(newToken: string): void {
    if (newToken === this.#token) {
      return;
    }

    this.#token = newToken;
    this.setIsTokenValid(false);
    this.flushStateChanges();

    void this.validateToken(newToken);
  }

  private setIsTokenValid(newIsTokenValidValue: boolean): void {
    if (newIsTokenValidValue === this.#isTokenValid) {
      return;
    }

    if (this.#isTokenValid && !newIsTokenValidValue) {
      this.#distrustGracePeriodTimeoutId = window.setTimeout(() => {
        this.#isInsideGracePeriod = false;
      }, this.options.gracePeriodTimeoutMs);
    } else {
      window.clearTimeout(this.#distrustGracePeriodTimeoutId);
      this.#isInsideGracePeriod = true;
    }

    this.#isTokenValid = newIsTokenValidValue;
    this.flushStateChanges();

    if (this.#isTokenValid) {
      this.writeTokenToLocalStorage();
    }
  }

  get token(): string {
    return this.#token;
  }

  get isTokenValid(): boolean {
    return this.#isTokenValid;
  }

  get authHeaderKey(): string {
    return this.options.authTokenHeaderKey;
  }

  get isInsideGracePeriod(): boolean {
    return this.#isInsideGracePeriod;
  }

  /* ***************************************************************************
   * All public functions should be defined as arrow functions to ensure they
   * can be passed around React without risk of losing their "this" context
   ****************************************************************************/

  subscribe = (
    callback: SubscriptionCallback<AuthTokenStateSnapshot>,
  ): (() => void) => {
    return this.snapshotManager.subscribe(callback);
  };

  unsubscribe = (callback: SubscriptionCallback): void => {
    return this.snapshotManager.unsubscribe(callback);
  };

  validateToken = async (tokenToValidate: string): Promise<boolean> => {
    const endpoint = await this.getApiEndpoint();

    let response: Response;
    try {
      // In this case, the request doesn't actually matter. Just need to make
      // any kind of dummy request to validate the auth
      response = await fetch(`${endpoint}/users/me`, this.getRequestInit());
    } catch (err) {
      if (tokenToValidate === this.#token) {
        this.setIsTokenValid(false);
      }

      throw err;
    }

    if (response.status >= 400 && response.status !== 401) {
      this.setIsTokenValid(false);
      throw new BackstageHttpError('Failed to complete request', response);
    }

    const newIsValidValue = response.status !== 401;
    if (tokenToValidate === this.#token) {
      this.setIsTokenValid(newIsValidValue);
    }

    return newIsValidValue;
  };

  registerNewToken = (newToken: string): void => {
    if (newToken !== '') {
      this.setToken(newToken);
    }
  };

  clearToken = (): void => {
    this.setToken('');
    this.writeTokenToLocalStorage();
  };

  getStateSnapshot = (): AuthTokenStateSnapshot => {
    return this.snapshotManager.getSnapshot();
  };

  getRequestInit = (): RequestInit => {
    const { authTokenHeaderKey, requestTimeoutMs } = this.options;
    return {
      headers: { [authTokenHeaderKey]: this.#token },
      signal: AbortSignal.timeout(requestTimeoutMs),
    };
  };

  assertAuthIsValid = (): void => {
    if (!this.#isTokenValid) {
      throw new Error(
        'Trying to access auth token before it has been validated',
      );
    }
  };
}
