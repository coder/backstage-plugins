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
