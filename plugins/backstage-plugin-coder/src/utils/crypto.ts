/**
 * Hashes a string into a 53-bit hash.
 *
 * Should not be treated as cryptographically secure enough for critically vital
 * services. Always supplement this with something else.
 *
 * Implementation modified from 100% public-domain code
 * @see {@link https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js}
 * @see {@link https://github.com/bryc/code/blob/master/LICENSE.md}
 */
export function hashValue(
  value: string | null,
  seed: number = 0,
): number | null {
  if (value === null) {
    return null;
  }

  let root1 = 0xdeadbeef ^ seed;
  let root2 = 0x41c6ce57 ^ seed;

  for (const char of value) {
    const charCode = char.charCodeAt(0);
    root1 = Math.imul(root1 ^ charCode, 2654435761);
    root2 = Math.imul(root2 ^ charCode, 1597334677);
  }

  root1 = Math.imul(root1 ^ (root1 >>> 16), 2246822507);
  root1 ^= Math.imul(root2 ^ (root2 >>> 13), 3266489909);
  root2 = Math.imul(root2 ^ (root2 >>> 16), 2246822507);
  root2 ^= Math.imul(root1 ^ (root1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & root2) + (root1 >>> 0);
}
