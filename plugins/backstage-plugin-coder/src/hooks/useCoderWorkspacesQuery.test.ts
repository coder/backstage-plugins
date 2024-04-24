import { waitFor } from '@testing-library/react';
import { useCoderWorkspacesQuery } from './useCoderWorkspacesQuery';

import { renderHookAsCoderEntity } from '../testHelpers/setup';
import { mockCoderWorkspacesConfig } from '../testHelpers/mockBackstageData';
import {
  mockWorkspaceNoParameters,
  mockWorkspacesList,
} from '../testHelpers/mockCoderAppData';

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.runOnlyPendingTimers();
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

  it('Will filter workspaces by search criteria when it is provided', async () => {
    const { result, rerender } = await renderHookAsCoderEntity(
      ({ coderQuery }) => useCoderWorkspacesQuery({ coderQuery }),
      { initialProps: { coderQuery: 'owner:me' } },
    );

    await waitFor(() => {
      expect(result.current.data?.length).toEqual(mockWorkspacesList.length);
    });

    rerender({ coderQuery: mockWorkspaceNoParameters.name });

    await waitFor(() => {
      const firstItemName = result.current.data?.[0]?.name;
      expect(firstItemName).toBe(mockWorkspaceNoParameters.name);
    });
  });

  it('Will only return workspaces for a given repo when a repoConfig is provided', async () => {
    const { result } = await renderHookAsCoderEntity(() => {
      return useCoderWorkspacesQuery({
        coderQuery: 'owner:me',
        workspacesConfig: mockCoderWorkspacesConfig,
      });
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data?.length).toBe(2);
  });
});
