import { EMBED_BATCH_SIZE, EMBED_MAX_BATCH_SIZE, EMBED_MAX_DIMENSIONS } from "../constants/similarity";
import { questionEmbeddingRepository } from "../repositories/question-embedding.repository";
import type { SubjectRef } from "../repositories/subject.repository";
import { vectorToBuffer } from "../utils/vector";
import type { EmbeddingInput, EmbeddingProvider } from "./embedding";

export interface EmbedSummary {
  model: string;
  embedded: number; // số câu vừa có vector
  skipped: number; // số câu nguồn không tạo được vector (vd chưa có dấu vân tay ảnh)
  batches: number;
}

const assertProvider = (provider: EmbeddingProvider) => {
  if (!Number.isInteger(provider.dimensions) || provider.dimensions <= 0 || provider.dimensions > EMBED_MAX_DIMENSIONS) {
    throw new Error(`Embedding model "${provider.modelName}" has unsupported dimensions ${provider.dimensions}`);
  }
};

const toRow = (provider: EmbeddingProvider, questionId: number, v: Float32Array) => {
  if (v.length !== provider.dimensions) throw new Error(`Model "${provider.modelName}" returned ${v.length} dimensions, expected ${provider.dimensions}`);
  return { questionId, modelName: provider.modelName, dimensions: provider.dimensions, embedding: vectorToBuffer(v) };
};

export const questionEmbeddingService = {
  /**
   * Tạo vector cho các câu của môn CHƯA có vector của model này, theo từng lô; mỗi lô ghi ngay (độc lập với lô khác)
   * nên dừng giữa chừng thì lần chạy sau làm tiếp phần còn thiếu, chạy lại khi đã đủ thì không làm gì.
   * Không tự tính dấu vân tay ảnh (việc đó do "Câu hay ra" làm dần): câu chưa có dấu vân tay được bỏ qua và đếm vào `skipped`.
   */
  async embedMissing(subject: SubjectRef, provider: EmbeddingProvider, { batchSize = EMBED_BATCH_SIZE }: { batchSize?: number } = {}): Promise<EmbedSummary> {
    assertProvider(provider);
    const take = Math.max(1, Math.min(EMBED_MAX_BATCH_SIZE, Math.floor(batchSize)));
    const summary: EmbedSummary = { model: provider.modelName, embedded: 0, skipped: 0, batches: 0 };
    let afterId = 0;

    for (;;) {
      const batch = await questionEmbeddingRepository.missingBatch(subject.code, provider.modelName, afterId, take);
      if (batch.length === 0) break;
      afterId = batch[batch.length - 1]!.id;

      const inputs: EmbeddingInput[] = batch.map((q) => ({ id: q.id, text: null, imageHash: q.imageHash }));
      const vectors = await provider.embed(inputs);
      const rows = inputs.flatMap((input, i) => {
        const v = vectors[i];
        return v ? [toRow(provider, input.id, v)] : [];
      });
      const written = await questionEmbeddingRepository.insertMany(rows);
      summary.embedded += written.count;
      summary.skipped += inputs.length - rows.length;
      summary.batches++;
      if (batch.length < take) break;
    }
    return summary;
  },
};
