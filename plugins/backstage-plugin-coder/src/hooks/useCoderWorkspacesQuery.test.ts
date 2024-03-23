import { waitFor } from '@testing-library/react';
import { useCoderWorkspacesQuery } from './useCoderWorkspacesQuery';

import { renderHookAsCoderEntity } from '../testHelpers/setup';
import { mockCoderWorkspacesConfig } from '../testHelpers/mockBackstageData';

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.clearAllTimers();
});

describe(`${useCoderWorkspacesQuery.name}`, () => {
  it('Will make a request when provided correct inputs', async () => {
    const { result } = await renderHookAsCoderEntity(() => {
      return useCoderWorkspacesQuery({ coderQuery: 'owner:me' });
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
  });

  it('Will not be enabled if auth token is missing', async () => {
    const { result } = await renderHookAsCoderEntity(
      () => useCoderWorkspacesQuery({ coderQuery: 'owner:me' }),
      { authStatus: 'invalid' },
    );

    const assertDisabledState = () => {
      expect(result.current.status).toBe('loading');
      expect(result.current.fetchStatus).toBe('idle');
    };

    assertDisabledState();
    setTimeout(assertDisabledState, 5_000);

    await jest.advanceTimersByTimeAsync(10_000);
  });

  /* eslint-disable-next-line jest/no-disabled-tests --
     Putting this off for the moment, because figuring out how to mock this out
     without making the code fragile/flaky will probably take some time
  */
  it.skip('Will filter workspaces by search criteria when it is provided', async () => {
    expect.hasAssertions();
  });

  it('Will only return workspaces for a given repo when a repoConfig is provided', async () => {
    const { result } = await renderHookAsCoderEntity(() => {
      return useCoderWorkspacesQuery({
        coderQuery: 'owner:me',
        workspacesConfig: mockCoderWorkspacesConfig,
      });
    });

    // This query takes a little bit longer to run and process; waitFor will
    // almost always give up too early if a longer timeout isn't specified
    await waitFor(() => expect(result.current.status).toBe('success'), {
      timeout: 3_000,
    });

    expect(result.current.data?.length).toBe(1);
  });
});
