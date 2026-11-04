import path from "node:path";

export const AI_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type AiEffort = (typeof AI_EFFORTS)[number];

export interface AiConfig {
  enabled: boolean; // bật thì mỗi đề mới lấy về sẽ được Claude giải đáp án
  anthropicApiKey: string; // khóa Anthropic (console.anthropic.com)
  claudeModel: string;
  effort: AiEffort; // mức suy luận: cao hơn chính xác hơn nhưng tốn token hơn
  explainPrice: number; // phí (credit) mỗi lần người dùng xem lời giải thích AI của một câu
  useSearch: boolean; // cho Claude tra web (web search) khi không chắc, tính thêm phí theo lượt tìm
}

export const AI_DEFAULTS: AiConfig = {
  enabled: true, // có khóa là dùng AI; tắt thủ công ở trang Quản trị nếu cần
  anthropicApiKey: "",
  claudeModel: "claude-haiku-5-5",
  effort: "high",
  explainPrice: 20,
  useSearch: false,
};

export const aiReady = (c: AiConfig) => c.enabled && c.anthropicApiKey.length > 0;

export const AI_KEY_PREFIX = "ai.";

// Prompt giải thích một câu hỏi (tiếng Anh, trả lời bằng tiếng Việt) nằm ở backend/prompts/explain/, tách riêng với prompt giải đề
export const EXPLAIN_MAX_OUTPUT_TOKENS = 4_000; // gồm cả token suy luận
export const EXPLAIN_EFFORT: AiEffort = "medium"; // giải thích một câu không cần suy luận sâu như giải cả đề

// Prompt giải đề (base + module theo môn + khối tính năng) nằm ở backend/prompts/, nạp bởi src/prompts/index.ts

// Một lượt giải (nhiều ảnh, suy luận sâu, có thể tra web) có thể kéo dài vài phút
export const AI_TIMEOUT_MS = 10 * 60 * 1000;
export const AI_MAX_OUTPUT_TOKENS = 32_000; // gồm cả token suy luận
export const AI_MAX_SEARCHES = 5; // số lượt tra web tối đa mỗi đề khi bật useSearch
// Ảnh có cạnh dài hơn mức này được thu nhỏ trước khi gửi (chỉ bản gửi đi, ảnh gốc giữ nguyên): token ảnh tỉ lệ với số điểm ảnh
export const AI_IMAGE_MAX_EDGE = 1280;
// Đề dài được chia thành các lô nhỏ gọi Claude song song (mỗi lô chỉ kèm ảnh và bình luận của các câu trong lô): nhanh hơn nhiều
// và tốn ít token hơn so với một lần gọi khổng lồ. Đề ngắn hơn ngưỡng này vẫn giải trong một lần.
export const AI_BATCH_SIZE = 12;
export const AI_MAX_PARALLEL_CALLS = 6; // tổng số lần gọi Claude cùng lúc trên toàn server (qua mọi đề), tránh chạm giới hạn tốc độ
export const AI_MAX_PAUSES = 4; // tra web lâu có thể bị tạm dừng giữa chừng, tiếp tục tối đa chừng này lần

// Giải được ít hơn tỉ lệ này số câu cần giải thì coi cả đề là lỗi (thường là lỗi hệ thống như hết credit); ít câu thiếu lẻ tẻ thì vẫn nhận kết quả
export const AI_MIN_SOLVED_RATIO = 0.5;

export const AI_REPORT_FAILED_PREFIX = "AI không giải được đề này. Lý do: ";
// Chờ tối thiểu giữa hai lần người dùng bấm "Thử lại" cùng một đề (tránh đốt token)
export const AI_RETRY_COOLDOWN_MS = 60 * 1000;
