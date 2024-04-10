import type { CoderAuthApi, IsAuthValidCallback } from './Auth';
import { StateSnapshotManager } from '../utils/StateSnapshotManager';

type ConfigOptions = Readonly<{
  localStorage: typeof window.localStorage;
  localStorageKey: string;

  // Handles auth edge case where a previously-valid token can't be verified.
  // Not immediately removing token to provide better UX in case someone's
  // internet disconnects for a few seconds
  gracePeriodTimeoutMs: number;
}>;

export const defaultTokenAuthConfigOptions = {
  localStorage: window.localStorage,
  localStorageKey: 'coder-backstage-plugin/token',
  gracePeriodTimeoutMs: 6_000,
} as const satisfies ConfigOptions;

export type AuthTokenStateSnapshot = Readonly<{
  token: string;
  isTokenValid: boolean;
  initialToken: string;
  isInsideGracePeriod: boolean;
}>;

type SubscriptionCallback<TSnapshot = AuthTokenStateSnapshot> = (
  snapshot: TSnapshot,
) => void;

export interface CoderTokenAuthApi
  extends CoderAuthApi<AuthTokenStateSnapshot> {
  readonly initialToken: string;
  readonly isInsideGracePeriod: boolean;

  clearToken: () => void;
  registerNewToken: (newToken: string) => void;
}

export class CoderTokenAuth implements CoderTokenAuthApi {
  readonly initialToken: string;
  private readonly options: ConfigOptions;
  private readonly snapshotManager: StateSnapshotManager<AuthTokenStateSnapshot>;

  #token: string;
  #isTokenValid: boolean;
  #isInsideGracePeriod: boolean;
  #distrustGracePeriodTimeoutId: number | undefined;

  constructor(options?: Partial<ConfigOptions>) {
    this.options = { ...defaultTokenAuthConfigOptions, ...(options ?? {}) };

    this.initialToken = this.readTokenFromLocalStorage();
    this.#token = this.initialToken;
    this.#isTokenValid = false;
    this.#isInsideGracePeriod = true;
    this.#distrustGracePeriodTimeoutId = undefined;

    const initialSnapshot: AuthTokenStateSnapshot = {
      token: this.#token,
      isTokenValid: this.#isTokenValid,
      initialToken: this.initialToken,
      isInsideGracePeriod: this.#isInsideGracePeriod,
    };

    this.snapshotManager = new StateSnapshotManager({ initialSnapshot });
  }

  static isInstance(value: unknown): value is CoderTokenAuth {
    return value instanceof CoderTokenAuth;
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

  private notifySubscriptions(): void {
    const newSnapshot: AuthTokenStateSnapshot = {
      token: this.#token,
      isTokenValid: this.#isTokenValid,
      initialToken: this.initialToken,
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
    this.notifySubscriptions();
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
    this.notifySubscriptions();

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

  getStateSnapshot = (): AuthTokenStateSnapshot => {
    return this.snapshotManager.getSnapshot();
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

  validateAuth = async (
    validationMethod: IsAuthValidCallback,
  ): Promise<boolean> => {
    try {
      const isValid = await validationMethod(this.#token);
      this.setIsTokenValid(isValid);
      return isValid;
    } catch (err) {
      this.setIsTokenValid(false);
      throw err;
    }
  };
}