import { FINGERPRINT_MODEL } from "../../constants/similarity";
import type { EmbeddingProvider } from "./embedding-provider";
import { FingerprintEmbeddingProvider } from "./fingerprint.provider";

export type { EmbeddingInput, EmbeddingProvider } from "./embedding-provider";
export { FingerprintEmbeddingProvider } from "./fingerprint.provider";
export { FakeEmbeddingProvider } from "./fake.provider";
export { TextEmbeddingProvider } from "./text.provider";

// Các nguồn vector dùng được trong lệnh chạy tay (nguồn chữ chưa có nên không nằm ở đây)
const PROVIDERS: Record<string, () => EmbeddingProvider> = {
  [FINGERPRINT_MODEL]: () => new FingerprintEmbeddingProvider(),
};

export const embeddingModels = () => Object.keys(PROVIDERS);

export function providerFor(modelName: string): EmbeddingProvider {
  const make = PROVIDERS[modelName];
  if (!make) throw new Error(`Unknown embedding model "${modelName}". Available: ${embeddingModels().join(", ")}`);
  return make();
}
