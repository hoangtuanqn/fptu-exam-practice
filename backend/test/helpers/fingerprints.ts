import { HASH_BYTES } from "../../src/utils/question-hash";

// Dấu vân tay giả cho test: ngẫu nhiên nhưng cố định theo seed, và bản "gần giống" bằng cách lật vài bit.

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function randomHash(seed: number): Uint8Array<ArrayBuffer> {
  const rand = mulberry32(seed);
  const h = new Uint8Array(HASH_BYTES);
  for (let i = 0; i < h.length; i++) h[i] = Math.floor(rand() * 256);
  return h;
}

/** Bản sao với các bit ở vị trí `bits` bị lật (hamming đúng bằng số vị trí khác nhau). */
export function flipBits(hash: Uint8Array, bits: readonly number[]): Uint8Array<ArrayBuffer> {
  const h = new Uint8Array(hash);
  for (const b of new Set(bits)) h[b >> 3]! ^= 1 << (b & 7);
  return h;
}
