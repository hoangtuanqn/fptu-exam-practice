import { FREQUENT_MATCH_BITS } from "./frequent";

// Nhóm câu giống nhau giữa các đề (chạy tay bằng npm run groups:build, không gọi AI hay dịch vụ trả phí)

export const FINGERPRINT_MODEL = "image-fingerprint-v1"; // vector ±1 suy ra từ dấu vân tay ảnh 1536 bit (utils/question-hash)
export const FINGERPRINT_BITS = 1536;

// Mỗi lượt tạo vector xử lý chừng này câu rồi ghi luôn (dừng giữa chừng thì lần sau làm tiếp phần còn thiếu)
export const EMBED_BATCH_SIZE = 200;
export const EMBED_MAX_BATCH_SIZE = 2000;
// Cột embedding là MEDIUMBLOB (tối đa 16 MB) nhưng giữ vector gọn: float32 nên 4 byte mỗi chiều
export const EMBED_MAX_DIMENSIONS = 8192;

// Ngưỡng cosine mặc định cho vector chữ (embedding văn bản). Vector dấu vân tay có ngưỡng riêng ở dưới.
export const DEFAULT_GROUP_THRESHOLD = 0.9;

/**
 * Với vector dấu vân tay: cosine = 1 - 2 * hamming / 1536, tức hamming = (1 - cosine) * 768.
 * Mặc định khớp đúng ngưỡng FREQUENT_MATCH_BITS của "Câu hay ra" (6 bit -> cosine 0.9921875) để hai tính năng cho cùng kết quả.
 */
export const fingerprintThresholdForBits = (bits: number) => 1 - (2 * bits) / FINGERPRINT_BITS;

export const GROUP_THRESHOLD_BY_MODEL: Readonly<Record<string, number>> = {
  [FINGERPRINT_MODEL]: fingerprintThresholdForBits(FREQUENT_MATCH_BITS),
};

export const groupThresholdFor = (modelName: string) => GROUP_THRESHOLD_BY_MODEL[modelName] ?? DEFAULT_GROUP_THRESHOLD;

// Sai số float32 khi so cosine với ngưỡng (cặp đúng bằng ngưỡng vẫn được tính là giống)
export const SIMILARITY_EPSILON = 1e-6;

// --dry-run in các cặp có |cosine - ngưỡng| <= chừng này để người chỉnh ngưỡng xem tận mắt
export const GROUP_BORDERLINE_MARGIN = 0.05;
export const GROUP_BORDERLINE_MAX_PRINT = 200;

// Ghi lại nhóm của một môn trong một giao dịch: môn lớn có vài nghìn câu nên cho thời gian dài hơn mặc định 5 giây
export const GROUP_TX_TIMEOUT_MS = 120_000;
