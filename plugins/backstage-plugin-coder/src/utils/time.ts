export function delay(timeoutMs: number): Promise<void> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0) {
    throw new Error('Cannot delay by non-integer or negative values');
  }

  return new Promise<void>(resolve => {
    window.setTimeout(resolve, timeoutMs);
  });
}
