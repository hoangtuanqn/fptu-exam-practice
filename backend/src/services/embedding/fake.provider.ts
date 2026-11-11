import { normalize } from "../../utils/vector";
import type { EmbeddingInput, EmbeddingProvider } from "./embedding-provider";

// Chỉ dùng cho test: băm từng từ của `text` vào một ô (feature hashing) nên cùng chữ luôn ra cùng vector,
// chữ gần giống thì cosine cao. Không có chữ thì trả null như một câu không tạo được vector.
const fnv1a = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

export class FakeEmbeddingProvider implements EmbeddingProvider {
  constructor(
    readonly dimensions = 64,
    readonly modelName = "fake-v1",
  ) {}

  embedText(text: string) {
    const v = new Float32Array(this.dimensions);
    for (const word of text.toLowerCase().split(/\s+/).filter(Boolean)) {
      const h = fnv1a(word);
      v[h % this.dimensions]! += h & 0x80000000 ? -1 : 1;
    }
    return normalize(v);
  }

  async embed(inputs: readonly EmbeddingInput[]) {
    return inputs.map((i) => (i.text ? this.embedText(i.text) : null));
  }
}
