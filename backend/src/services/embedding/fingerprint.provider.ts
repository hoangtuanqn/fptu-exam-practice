import { FINGERPRINT_BITS, FINGERPRINT_MODEL } from "../../constants/similarity";
import { HASH_BYTES } from "../../utils/question-hash";
import type { EmbeddingInput, EmbeddingProvider } from "./embedding-provider";

// Mỗi bit của dấu vân tay thành một chiều +s hoặc -s (s = 1/sqrt(1536)) nên vector có độ dài 1 và
// cosine của hai vector = 1 - 2 * hamming / 1536. Miễn phí, không cần mạng, dùng ngay dấu vân tay đã lưu.
const SCALE = 1 / Math.sqrt(FINGERPRINT_BITS);

/** Đổi dấu vân tay thành vector ±1 đã chuẩn hoá; null nếu dấu vân tay sai độ dài. */
export function fingerprintToVector(hash: Uint8Array): Float32Array | null {
  if (hash.byteLength !== HASH_BYTES || HASH_BYTES * 8 !== FINGERPRINT_BITS) return null;
  const v = new Float32Array(FINGERPRINT_BITS);
  for (let i = 0; i < FINGERPRINT_BITS; i++) v[i] = (hash[i >> 3]! >> (i & 7)) & 1 ? SCALE : -SCALE;
  return v;
}

export class FingerprintEmbeddingProvider implements EmbeddingProvider {
  readonly modelName = FINGERPRINT_MODEL;
  readonly dimensions = FINGERPRINT_BITS;

  async embed(inputs: readonly EmbeddingInput[]) {
    return inputs.map((i) => (i.imageHash ? fingerprintToVector(i.imageHash) : null));
  }
}
