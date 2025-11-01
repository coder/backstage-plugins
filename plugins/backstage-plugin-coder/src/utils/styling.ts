/**
 * A custom focus color chosen to look close to a system default, while
 * remaining visible in dark and light themes. The focus values from Backstage's
 * theme object are too low-contrast to meet accessibility requirements.
 */
export const CUSTOM_FOCUS_COLOR = 'hsl(213deg, 94%, 68%)';

export function scaleCssUnit(
  baseSize: string | number | undefined,
  scale: number,
): string {
  if (!Number.isFinite(scale)) {
    return '1rem';
  }

  if (baseSize === undefined) {
    return `${scale}rem`;
  }

  if (typeof baseSize === 'number') {
    if (!Number.isFinite(baseSize)) {
      return `${scale}rem`;
    }

    return `${baseSize * scale}px`;
  }

  const sizeRe = /^\s*(?<value>\d+(?:\.\d+))?s*(?<unit>px|r?em)\s*$/i;
  const { value, unit } = sizeRe.exec(baseSize)?.groups ?? {};
  const numValue = Number(value);

  if (Number.isNaN(numValue) || unit === undefined) {
    return `${scale}rem`;
  }

  return `${scale * numValue}${unit}`;
}
