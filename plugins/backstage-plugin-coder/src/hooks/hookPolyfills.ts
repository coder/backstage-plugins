import React, { useState } from 'react';

let idCounter = 0;

/**
 * A janky, much less sophisticated polyfill for useId that only works
 * client-side. Unlike the native useId, this does not help with SSR hydration
 * issues because it does not have access to React internals. It is strictly
 * for helping with accessibility in reusable components.
 *
 * If Backstage drops support for React 16/17, this should be removed in favor
 * of the native hook.
 *
 * @see {@link https://react.dev/reference/react/useId}
 */
function useIdPolyfill(): string {
  // Dirty initialization - this does break the "renders should always be pure"
  // rule, but it's being done in a controlled way, and there's no other way to
  // ensure a truly unique value is available on the very first render.
  const [readonlyId] = useState(() => {
    idCounter++;
    return `:r${idCounter}:`;
  });

  return readonlyId;
}

export const useId =
  typeof React.useId === 'undefined' ? useIdPolyfill : React.useId;
