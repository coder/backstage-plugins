import type {
  SafeAuthData,
  AuthSubscriptionCallback,
  AuthValidatorDispatch,
  CoderAuthApi,
} from './Auth';
import { StateSnapshotManager } from '../utils/StateSnapshotManager';
import { hashValue } from '../utils/crypto';

export const AUTH_SETTER_TIMEOUT_MS = 20_000;

type ConfigOptions = Readonly<{
  localStorage: Storage;
  localStorageKey: string;

  // Handles auth edge case where a previously-valid token can't be verified.
  // Not immediately removing token to provide better UX in case someone's
  // internet disconnects for a few seconds
  gracePeriodTimeoutMs: number;
}>;

export const defaultTokenAuthConfigOptions = {
  localStorage: window.localStorage,
  localStorageKey: 'backstage-plugin-coder/token',
  gracePeriodTimeoutMs: 6_000,
} as const satisfies ConfigOptions;

export interface CoderTokenAuthApi extends CoderAuthApi {
  clearToken: () => void;
  registerNewToken: (newToken: string) => void;
}

export class CoderTokenAuth implements CoderTokenAuthApi {
  readonly initialTokenHash: number | null;
  private readonly options: ConfigOptions;
  private readonly snapshotManager: StateSnapshotManager<SafeAuthData>;

  #token: string;
  #tokenHash: number | null;
  #isTokenValid: boolean;
  #isInsideGracePeriod: boolean;
  #distrustGracePeriodTimeoutId: number | undefined;

  constructor(options?: Partial<ConfigOptions>) {
    this.options = { ...defaultTokenAuthConfigOptions, ...(options ?? {}) };

    const initialToken = this.readTokenFromLocalStorage();
    this.initialTokenHash = hashValue(initialToken);
    this.#token = initialToken ?? '';
    this.#tokenHash = this.initialTokenHash;

    this.#isTokenValid = false;
    this.#isInsideGracePeriod = true;
    this.#distrustGracePeriodTimeoutId = undefined;

    this.snapshotManager = new StateSnapshotManager({
      initialSnapshot: this.prepareNewSnapshot(),
    });
  }

  static isInstance(value: unknown): value is CoderTokenAuth {
    return value instanceof CoderTokenAuth;
  }

  private readTokenFromLocalStorage(): string | null {
    const key = this.options.localStorageKey;
    return this.options.localStorage.getItem(key);
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

  private prepareNewSnapshot(): SafeAuthData {
    return {
      tokenHash: this.#tokenHash,
      initialTokenHash: this.initialTokenHash,
      isTokenValid: this.#isTokenValid,
      isInsideGracePeriod: this.#isInsideGracePeriod,
    };
  }

  private notifySubscriptionsOfStateChange(): void {
    const newSnapshot = this.prepareNewSnapshot();
    this.snapshotManager.updateSnapshot(newSnapshot);
  }

  private setToken(newToken: string): void {
    if (newToken === this.#token) {
      return;
    }

    this.#token = newToken;
    this.#tokenHash = hashValue(newToken);
    this.setIsTokenValid(false);
    this.notifySubscriptionsOfStateChange();
  }

  private setIsTokenValid(newIsTokenValidValue: boolean): void {
    if (newIsTokenValidValue === this.#isTokenValid) {
      return;
    }

    if (this.#isTokenValid && !newIsTokenValidValue) {
      this.#distrustGracePeriodTimeoutId = window.setTimeout(() => {
        this.#isInsideGracePeriod = false;
        this.notifySubscriptionsOfStateChange();
      }, this.options.gracePeriodTimeoutMs);
    } else {
      window.clearTimeout(this.#distrustGracePeriodTimeoutId);
      this.#isInsideGracePeriod = true;
    }

    this.#isTokenValid = newIsTokenValidValue;
    this.notifySubscriptionsOfStateChange();

    if (this.#isTokenValid) {
      this.writeTokenToLocalStorage();
    }
  }

  get tokenHash(): number | null {
    return this.#tokenHash;
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

  requestToken = (): string | null => {
    return this.#token;
  };

  subscribe = (callback: AuthSubscriptionCallback): (() => void) => {
    return this.snapshotManager.subscribe(callback);
  };

  unsubscribe = (callback: AuthSubscriptionCallback): void => {
    return this.snapshotManager.unsubscribe(callback);
  };

  getStateSnapshot = (): SafeAuthData => {
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

  getAuthStateSetter = (): AuthValidatorDispatch => {
    const hashOnSetup = this.#tokenHash;
    if (hashOnSetup === null) {
      return () => {
        // Do nothing - setter is fully inert because there's no token loaded to
        // validate, and token changes would disable the function anyway
      };
    }

    let allowUpdate = true;
    let disableUpdatesTimeoutId: number | undefined = undefined;

    const onTokenChange = (newSnapshot: SafeAuthData) => {
      if (!allowUpdate || newSnapshot.tokenHash === hashOnSetup) {
        return;
      }

      allowUpdate = false;
      this.snapshotManager.unsubscribe(onTokenChange);
      window.clearTimeout(disableUpdatesTimeoutId);
    };

    this.snapshotManager.subscribe(onTokenChange);

    // Have to make sure that we eventually unsubscribe so that the onChange
    // callback can be garbage-collected, and we don't have a memory leak
    disableUpdatesTimeoutId = window.setTimeout(() => {
      allowUpdate = false;
      this.snapshotManager.unsubscribe(onTokenChange);
    }, AUTH_SETTER_TIMEOUT_MS);

    return newStatus => {
      if (allowUpdate) {
        this.setIsTokenValid(newStatus);
      }
    };
  };
}
