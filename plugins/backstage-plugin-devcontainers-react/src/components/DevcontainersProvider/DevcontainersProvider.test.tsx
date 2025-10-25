import { renderHook } from '@testing-library/react';
import {
  DEFAULT_DEVCONTAINERS_TAG,
  DevcontainersConfig,
  DevcontainersProvider,
  useDevcontainersConfig,
} from './DevcontainersProvider';

const baseConfig: DevcontainersConfig = { tagName: 'test' };

describe(`${DevcontainersProvider.name}`, () => {
  it('Stabilizes the memory reference for the config value when defined outside the component', () => {
    const { result, rerender } = renderHook(useDevcontainersConfig, {
      wrapper: ({ children }) => (
        <DevcontainersProvider config={baseConfig}>
          {children}
        </DevcontainersProvider>
      ),
    });

    const initialResult = result.current;
    rerender();
    expect(result.current).toBe(initialResult);
  });

  it('Will update the memory reference for the config each render if it is accidentally passed inline', () => {
    const { result, rerender } = renderHook(useDevcontainersConfig, {
      wrapper: ({ children }) => (
        <DevcontainersProvider config={{ ...baseConfig }}>
          {children}
        </DevcontainersProvider>
      ),
    });

    const initialResult = result.current;
    rerender();
    expect(result.current).not.toBe(initialResult);
    expect(result.current).toEqual(initialResult);
  });

  it("Uses the default devcontainers tag when a tag override isn't provided", () => {
    const emptyConfig: DevcontainersConfig = {};
    const { result } = renderHook(useDevcontainersConfig, {
      wrapper: ({ children }) => (
        <DevcontainersProvider config={emptyConfig}>
          {children}
        </DevcontainersProvider>
      ),
    });

    expect(result.current.tagName).toBe(DEFAULT_DEVCONTAINERS_TAG);
  });
});
