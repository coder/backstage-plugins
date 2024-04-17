import { getMockLocalStorage } from '../testHelpers/mockBackstageData';
import { type AuthTokenStateSnapshot, CoderTokenAuth } from './CoderTokenAuth';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const localStorageKey = 'backstage-plugin-coder/test';

type SetupAuthResult = Readonly<{
  localStorage: Storage;
  auth: CoderTokenAuth;
}>;

function setupAuth(initialData: Record<string, string> = {}): SetupAuthResult {
  const localStorage = getMockLocalStorage(initialData);
  const auth = new CoderTokenAuth({ localStorageKey, localStorage });

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

    it('Lets external systems UN-subscribe to auth changes', () => {
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
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          isTokenValid: false,
        }),
      );
    });
  });

  describe('getAuthStateSetter', () => {
    it('Lets another system set the auth state', () => {
      const testToken = 'blah';
      const { auth } = setupAuth();

      auth.registerNewToken(testToken);
      const dispatchNewStatus = auth.getAuthStateSetter();
      dispatchNewStatus(true);

      const snapshot = auth.getStateSnapshot();
      expect(snapshot).toEqual(
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          token: testToken,
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

    it('If token changes after setter is created, no state dispatches will go through', () => {
      const onChange = jest.fn();
      const { auth } = setupAuth();

      auth.registerNewToken('dog');
      const dispatchNewStatus = auth.getAuthStateSetter();
      auth.registerNewToken('cat');

      dispatchNewStatus(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("The state setter automatically 'turns off' after a set amount of time (will start rejecting dispatches)", () => {
      expect.hasAssertions();
    });

    it.only("Will enter a 'grace period' state if the auth validity flips from true to false, but will eventually become false", async () => {
      const { auth } = setupAuth();
      auth.registerNewToken('blah');
      const dispatchNewStatus = auth.getAuthStateSetter();

      dispatchNewStatus(true);
      const snapshot1 = auth.getStateSnapshot();
      expect(snapshot1).toEqual(
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          isTokenValid: true,
          isInsideGracePeriod: true,
        }),
      );

      dispatchNewStatus(false);
      const snapshot2 = auth.getStateSnapshot();
      expect(snapshot2).toEqual(
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          isTokenValid: false,
          isInsideGracePeriod: true,
        }),
      );

      await jest.advanceTimersByTimeAsync(60_000);
      const snapshot3 = auth.getStateSnapshot();
      expect(snapshot3).toEqual(
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          isTokenValid: false,
          isInsideGracePeriod: false,
        }),
      );
    });
  });

  describe('localStorage', () => {
    it('Will read from localStorage when first initialized', () => {
      const testValue = 'blah';
      const { auth } = setupAuth({ [localStorageKey]: testValue });
      const initialStateSnapshot = auth.getStateSnapshot();

      expect(initialStateSnapshot).toEqual(
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          initialToken: testValue,
          token: testValue,
          isTokenValid: false,
        }),
      );
    });

    it('Will immediately update localStorage when token is cleared', () => {
      const { auth, localStorage } = setupAuth({
        [localStorageKey]: 'blah',
      });

      auth.clearToken();
      expect(localStorage.getItem(localStorageKey)).toEqual('');
    });

    it('Will write to localStorage when the auth validity flips to true', () => {
      expect.hasAssertions();
    });

    it('Lets the user define a custom local storage key', () => {
      expect.hasAssertions();
    });
  });
});
