import path from "node:path";

export type AiProvider = "gemini" | "aimlapi";

export interface AiConfig {
  enabled: boolean; // bật thì mỗi đề mới lấy về sẽ được AI giải đáp án
  provider: AiProvider; // nhà cung cấp đang dùng
  apiKey: string; // khóa Gemini (Google AI Studio)
  model: string; // model Gemini
  aimlApiKey: string; // khóa AIMLAPI (api.aimlapi.com, giao thức giống OpenAI)
  aimlModel: string; // model qua AIMLAPI, ví dụ openai/gpt-5-5
  useSearch: boolean; // cho Gemini tra Google (grounding) khi giải, theo bước 4 của prompt
}

export const AI_DEFAULTS: AiConfig = {
  enabled: true, // có khóa Gemini là dùng AI; tắt thủ công ở trang Quản trị nếu cần
  provider: "gemini",
  apiKey: "",
  model: "gemini-3-flash-preview",
  aimlApiKey: "",
  aimlModel: "openai/gpt-5-5",
  useSearch: false, // tra Google tốn thêm phí/quota; bật ở Quản trị nếu muốn kiểm tra kỹ các câu khó
};

// Khóa của nhà cung cấp đang chọn; dùng được khi đã bật và có khóa
export const activeKey = (c: AiConfig) => (c.provider === "aimlapi" ? c.aimlApiKey : c.apiKey);
export const aiReady = (c: AiConfig) => c.enabled && activeKey(c).length > 0;

export const AI_KEY_PREFIX = "ai.";

// Prompt hệ thống (hướng dẫn giải đề). Có thể đổi bằng biến môi trường AI_PROMPT_FILE
export const DEFAULT_PROMPT_FILE = path.resolve(__dirname, "../../assets/prompts/huong-dan-giai-de.md");

// Một lượt gọi AI (có tra Google và suy luận nhiều bước) có thể kéo dài vài phút
export const AI_TIMEOUT_MS = 6 * 60 * 1000;
export const AI_RETRIES = 1;

// Ghi chú khi AI không dùng được và đề rơi về đáp án tạm
export const AI_REPORT_FAILED_PREFIX = "AI không giải được đề này. Lý do: ";
// Chờ tối thiểu giữa hai lần người dùng bấm "Thử lại" cùng một đề (tránh đốt token)
export const AI_RETRY_COOLDOWN_MS = 60 * 1000;
