import path from "node:path";

export const AI_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type AiEffort = (typeof AI_EFFORTS)[number];

export interface AiConfig {
  enabled: boolean; // bật thì mỗi đề mới lấy về sẽ được Claude giải đáp án
  anthropicApiKey: string; // khóa Anthropic (console.anthropic.com)
  claudeModel: string;
  effort: AiEffort; // mức suy luận: cao hơn chính xác hơn nhưng tốn token hơn
  useSearch: boolean; // cho Claude tra web (web search) khi không chắc, tính thêm phí theo lượt tìm
}

export const AI_DEFAULTS: AiConfig = {
  enabled: true, // có khóa là dùng AI; tắt thủ công ở trang Quản trị nếu cần
  anthropicApiKey: "",
  claudeModel: "claude-haiku-5-5",
  effort: "high",
  useSearch: false,
};

export const aiReady = (c: AiConfig) => c.enabled && c.anthropicApiKey.length > 0;

export const AI_KEY_PREFIX = "ai.";

// Prompt hệ thống (tiếng Anh, cố định cho mọi đề nên được cache). Đổi bằng biến môi trường AI_PROMPT_FILE
export const DEFAULT_PROMPT_FILE = path.resolve(__dirname, "../../assets/prompts/exam-solver.system.md");

// Một lượt giải (nhiều ảnh, suy luận sâu, có thể tra web) có thể kéo dài vài phút
export const AI_TIMEOUT_MS = 10 * 60 * 1000;
export const AI_MAX_OUTPUT_TOKENS = 32_000; // gồm cả token suy luận
export const AI_MAX_SEARCHES = 5; // số lượt tra web tối đa mỗi đề khi bật useSearch
// Ảnh có cạnh dài hơn mức này được thu nhỏ trước khi gửi (chỉ bản gửi đi, ảnh gốc giữ nguyên): token ảnh tỉ lệ với số điểm ảnh
export const AI_IMAGE_MAX_EDGE = 1280;
export const AI_MAX_PAUSES = 4; // tra web lâu có thể bị tạm dừng giữa chừng, tiếp tục tối đa chừng này lần

export const AI_REPORT_FAILED_PREFIX = "AI không giải được đề này. Lý do: ";
// Chờ tối thiểu giữa hai lần người dùng bấm "Thử lại" cùng một đề (tránh đốt token)
export const AI_RETRY_COOLDOWN_MS = 60 * 1000;
