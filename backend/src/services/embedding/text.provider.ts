import type { EmbeddingInput, EmbeddingProvider } from "./embedding-provider";

/**
 * CHƯA DÙNG ĐƯỢC: chỗ dành cho nguồn vector theo chữ (OCR ảnh câu hỏi rồi embedding văn bản) trong tương lai.
 * Khi làm thật: chạy cục bộ hoặc đặt sau công tắc admin, có timeout và giới hạn (xem architecture-rules), đặt modelName riêng
 * và thêm ngưỡng vào GROUP_THRESHOLD_BY_MODEL. Hiện mọi lời gọi đều báo "not configured".
 */
export class TextEmbeddingProvider implements EmbeddingProvider {
  constructor(
    readonly modelName = "text-not-configured",
    readonly dimensions = 0,
  ) {}

  async embed(_inputs: readonly EmbeddingInput[]): Promise<(Float32Array | null)[]> {
    throw new Error("Text embedding provider is not configured");
  }
}
