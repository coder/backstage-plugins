import { renderHook } from '@testing-library/react';
import { useId } from './hookPolyfills';

describe(`${useId.name}`, () => {
  it('Has a value available on the mounting render', () => {
    const { result } = renderHook(useId);
    const id = result.current;

    expect(typeof id).toEqual('string');
    expect(id).not.toBe('');
  });

  it('Maintains a stable value across renders', () => {
    const { result, rerender } = renderHook(useId);
    const mountValue = result.current;
    rerender();

    const rerenderValue = result.current;
    expect(mountValue).toBe(rerenderValue);
  });

  it('Makes sure that multiple components using the hook receive different values', () => {
    const { result: result1 } = renderHook(useId);
    const { result: result2 } = renderHook(useId);
    expect(result1.current).not.toEqual(result2.current);
  });
});
