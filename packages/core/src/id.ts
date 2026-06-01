// URL-safe id generator (nanoid's alphabet) with no runtime dependency, so core
// keeps zod as its only dependency. Works in Node >= 20 and browsers via Web Crypto.
const ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

/** Generate a URL-safe, collision-resistant id (default 21 chars, like nanoid). */
export function newId(size = 21): string {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) {
    // `& 63` indexes into the 64-char alphabet, so the result is always defined.
    id += ALPHABET[byte & 63]!;
  }
  return id;
}
