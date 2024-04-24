import { getMockLocalStorage } from '../testHelpers/mockBackstageData';
import { hashValue } from '../utils/crypto';
import type { SafeAuthData } from './Auth';
import { CoderTokenAuth, AUTH_SETTER_TIMEOUT_MS } from './CoderTokenAuth';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Aggressively short time to ensure that the class can accept any arbitrary
// timeout value. The auth logic is 90% synchronous, so this has no real risks
const defaultGracePeriodTimeoutMs = 1_000;
const defaultLocalStorageKey = 'backstage-plugin-coder/test';

type SetupAuthInputs = Readonly<{
  initialData?: Record<string, string>;
  gracePeriodTimeoutMs?: number;
  localStorageKey?: string;
}>;

type SetupAuthResult = Readonly<{
  localStorage: Storage;
  auth: CoderTokenAuth;
}>;

function setupAuth(inputs?: SetupAuthInputs): SetupAuthResult {
  const {
    initialData,
    localStorageKey = defaultLocalStorageKey,
    gracePeriodTimeoutMs = defaultGracePeriodTimeoutMs,
  } = inputs ?? {};

  const localStorage = getMockLocalStorage(initialData);
  const auth = new CoderTokenAuth({
    localStorage,
    localStorageKey,
    gracePeriodTimeoutMs,
  });

  return { auth, localStorage };
}

describe(`${CoderTokenAuth.name}`, () => {
  describe('Subscriptions', () => {
    it('Lets external systems subscribe to auth changes', () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('blah');
      expect(onChange).toHaveBeenCalled();
    });

    it('Lets external systems *un*subscribe to auth changes', () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();
      auth.subscribe(onChange);
      auth.unsubscribe(onChange);

      auth.registerNewToken('blah');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Setting tokens', () => {
    it('Will reject empty strings', () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it("Will reject new token if it's the same as the current one", () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('blah');
      auth.registerNewToken('blah');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Will immediately notify subscriptions that the auth has been invalidated when a new token is set', () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('blah');
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining<Partial<SafeAuthData>>({
          isTokenValid: false,
        }),
      );
    });
  });

  describe('getAuthStateSetter', () => {
    it('Lets another system set the auth state', () => {
      const testToken = 'blah';
      const hashed = hashValue(testToken);
      const { auth } = setupAuth();

      auth.registerNewToken(testToken);
      const dispatchNewStatus = auth.getAuthStateSetter();
      dispatchNewStatus(true);

      const snapshot = auth.getStateSnapshot();
      expect(snapshot).toEqual(
        expect.objectContaining<Partial<SafeAuthData>>({
          tokenHash: hashed,
          isTokenValid: true,
        }),
      );
    });

    it('Rejects state changes if there is no token when the state setter is made', () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();

      auth.subscribe(onChange);
      const dispatchNewStatus = auth.getAuthStateSetter();
      dispatchNewStatus(true);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('Disables the state setter if the token changes after the setter was created', () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();

      auth.registerNewToken('dog');
      const dispatchNewStatus = auth.getAuthStateSetter();
      auth.registerNewToken('cat');

      dispatchNewStatus(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("Makes the state setter 'go inert' after a set amount of time (will start rejecting dispatches)", async () => {
      const { auth } = setupAuth();
      auth.registerNewToken('blah');
      const dispatchNewStatus = auth.getAuthStateSetter();

      // Give an extra 100ms to give code time to flush state changes
      await jest.advanceTimersByTimeAsync(AUTH_SETTER_TIMEOUT_MS + 100);
      dispatchNewStatus(true);

      const snapshot = auth.getStateSnapshot();
      expect(snapshot).toEqual(
        expect.objectContaining<Partial<SafeAuthData>>({
          isTokenValid: false,
        }),
      );
    });

    it("Will eventually leave 'grace period' state when auth validity flips from true to false", async () => {
      const { auth } = setupAuth();
      auth.registerNewToken('blah');
      const dispatchNewStatus = auth.getAuthStateSetter();

      dispatchNewStatus(true);
      const snapshot1 = auth.getStateSnapshot();
      expect(snapshot1).toEqual(
        expect.objectContaining<Partial<SafeAuthData>>({
          isTokenValid: true,
          isInsideGracePeriod: true,
        }),
      );

      dispatchNewStatus(false);
      const snapshot2 = auth.getStateSnapshot();
      expect(snapshot2).toEqual(
        expect.objectContaining<Partial<SafeAuthData>>({
          isTokenValid: false,
          isInsideGracePeriod: true,
        }),
      );

      await jest.advanceTimersByTimeAsync(defaultGracePeriodTimeoutMs);
      const snapshot3 = auth.getStateSnapshot();
      expect(snapshot3).toEqual(
        expect.objectContaining<Partial<SafeAuthData>>({
          isTokenValid: false,
          isInsideGracePeriod: false,
        }),
      );
    });
  });

  describe('localStorage', () => {
    it('Will read from localStorage when first initialized', () => {
      const testValue = 'blah';
      const hashed = hashValue(testValue);

      const { auth } = setupAuth({
        initialData: {
          [defaultLocalStorageKey]: testValue,
        },
      });

      const initialStateSnapshot = auth.getStateSnapshot();
      expect(initialStateSnapshot).toEqual(
        expect.objectContaining<Partial<SafeAuthData>>({
          initialTokenHash: hashed,
          tokenHash: hashed,
          isTokenValid: false,
        }),
      );
    });

    it('Will immediately update localStorage when token is cleared', () => {
      const { auth, localStorage } = setupAuth({
        initialData: {
          [defaultLocalStorageKey]: 'blah',
        },
      });

      auth.clearToken();
      expect(localStorage.getItem(defaultLocalStorageKey)).toEqual('');
    });

    it('Will write to localStorage when the token is confirmed to be valid', () => {
      const testToken = 'blah';
      const { auth, localStorage } = setupAuth();

      auth.registerNewToken(testToken);
      const dispatchNewStatus = auth.getAuthStateSetter();
      dispatchNewStatus(true);

      expect(localStorage.getItem(defaultLocalStorageKey)).toEqual(testToken);
    });

    it('Lets the user define a custom local storage key', () => {
      const customKey = 'blah';
      const testToken = 'blah blah';

      const { auth, localStorage } = setupAuth({
        localStorageKey: customKey,
      });

      auth.registerNewToken(testToken);
      const dispatchNewStatus = auth.getAuthStateSetter();
      dispatchNewStatus(true);

      expect(localStorage.getItem(customKey)).toEqual(testToken);
    });
  });
});
