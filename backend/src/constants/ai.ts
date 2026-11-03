import path from "node:path";

export interface AiConfig {
  enabled: boolean; // bật thì mỗi đề mới lấy về sẽ được AI giải đáp án
  apiKey: string; // khóa Gemini (Google AI Studio)
  model: string;
  useSearch: boolean; // cho Gemini tra Google (grounding) khi giải, theo bước 4 của prompt
}

export const AI_DEFAULTS: AiConfig = {
  enabled: false,
  apiKey: "",
  model: "gemini-2.5-pro",
  useSearch: true,
};

export const AI_KEY_PREFIX = "ai.";

// Prompt hệ thống (hướng dẫn giải đề). Có thể đổi bằng biến môi trường AI_PROMPT_FILE
export const DEFAULT_PROMPT_FILE = path.resolve(__dirname, "../../assets/prompts/huong-dan-giai-de.md");

// Một lượt gọi AI (có tra Google và suy luận nhiều bước) có thể kéo dài vài phút
export const AI_TIMEOUT_MS = 6 * 60 * 1000;
export const AI_RETRIES = 1;

// Ghi chú khi AI không dùng được và đề rơi về đáp án tạm
export const AI_REPORT_FALLBACK_PREFIX = "AI không giải được đề này, đang dùng đáp án tạm (A). Lý do: ";
