import { getMockLocalStorage } from '../testHelpers/mockBackstageData';
import { type AuthTokenStateSnapshot, CoderTokenAuth } from './CoderTokenAuth';

const localStorageKey = 'backstage-plugin-coder/test';
function makeAuth(initialData: Record<string, string> = {}): CoderTokenAuth {
  return new CoderTokenAuth({
    localStorageKey,
    localStorage: getMockLocalStorage(initialData),
  });
}

describe(`${CoderTokenAuth.name}`, () => {
  describe('Subscriptions', () => {
    it('Lets external systems subscribe to auth changes', async () => {
      const onChange = jest.fn();
      const auth = makeAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('blah');
      expect(onChange).toHaveBeenCalled();
    });

    it('Lets external systems UN-subscribe to auth changes', async () => {
      const onChange = jest.fn();
      const auth = makeAuth();
      auth.subscribe(onChange);
      auth.unsubscribe(onChange);

      auth.registerNewToken('blah');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Setting tokens', () => {
    it('Will reject empty strings', async () => {
      const onChange = jest.fn();
      const auth = makeAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it("Will reject new token if it's the same as the current one", async () => {
      const onChange = jest.fn();
      const auth = makeAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('blah');
      auth.registerNewToken('blah');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Will immediately notify subscriptions that the auth has been invalidated when a new token is set', async () => {
      const onChange = jest.fn();
      const auth = makeAuth();
      auth.subscribe(onChange);

      auth.registerNewToken('blah');
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          isTokenValid: false,
        }),
      );
    });
  });

  describe('localStorage', () => {
    it('Will read from localStorage when first initialized', async () => {
      const testValue = 'blah';
      const auth = makeAuth({ [localStorageKey]: testValue });
      const initialStateSnapshot = auth.getStateSnapshot();

      expect(initialStateSnapshot).toEqual(
        expect.objectContaining<Partial<AuthTokenStateSnapshot>>({
          initialToken: testValue,
          token: testValue,
          isTokenValid: false,
        }),
      );
    });

    it.only('Will write to localStorage when the auth validity flips to true', async () => {
      expect.hasAssertions();
    });

    it('Lets the user define a custom local storage key', async () => {
      expect.hasAssertions();
    });

    it('Will immediately update localStorage when token is cleared', async () => {
      expect.hasAssertions();
    });
  });

  describe('getAuthStateSetter', () => {
    it('Lets another system set the auth state', async () => {
      expect.hasAssertions();
    });

    it('If token changes after setter is created, no state dispatches will go through', async () => {
      expect.hasAssertions();
    });

    it("The state setter automatically 'turns off' after a set amount of time (will start rejecting dispatches)", async () => {
      expect.hasAssertions();
    });

    it("Will enter a 'grace period' state if the auth validity flips from true to false, but will eventually become false", async () => {
      expect.hasAssertions();
    });
  });
});
