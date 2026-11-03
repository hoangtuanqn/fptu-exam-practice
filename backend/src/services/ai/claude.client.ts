import Anthropic from "@anthropic-ai/sdk";
import { AI_MAX_OUTPUT_TOKENS, AI_MAX_PAUSES, AI_MAX_SEARCHES, AI_TIMEOUT_MS, type AiEffort } from "../../constants/ai";

// Haiku chưa có bản tra web mới (lọc động), dùng bản cơ bản
const SEARCH_TOOL = (model: string) => (/haiku/i.test(model) ? "web_search_20250305" : "web_search_20260209");

export type ClaudeContent = Anthropic.ContentBlockParam;

export interface ClaudeRequest {
  apiKey: string;
  model: string;
  effort: AiEffort;
  system: string; // prompt hệ thống cố định (được cache giữa các đề)
  content: ClaudeContent[];
  schema: Record<string, unknown>; // JSON Schema của kết quả: Claude trả đúng cấu trúc này
  useSearch: boolean;
}

/**
 * Gọi Claude một lượt và trả về JSON đã parse theo `schema` (structured outputs).
 * - Suy luận thích ứng (adaptive thinking), độ sâu theo `effort`.
 * - Prompt hệ thống gắn cache_control: các đề giải liên tiếp đọc lại prompt từ cache với giá rẻ.
 * - Stream rồi lấy message cuối: lượt dài không bị ngắt vì timeout HTTP.
 * - Có bật tra web thì lượt có thể dừng giữa chừng (pause_turn): gửi lại để Claude làm tiếp.
 * Lỗi 429/5xx do SDK tự thử lại; lỗi còn lại ném ra với lời nhắn rõ ràng.
 */
export async function askClaude({ apiKey, model, effort, system, content, schema, useSearch }: ClaudeRequest): Promise<unknown> {
  const client = new Anthropic({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 2 });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content }];

  try {
    for (let turn = 0; turn <= AI_MAX_PAUSES; turn++) {
      const message = await client.messages
        .stream({
          model,
          max_tokens: AI_MAX_OUTPUT_TOKENS,
          thinking: { type: "adaptive" },
          output_config: { effort, format: { type: "json_schema", schema } },
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          ...(useSearch && { tools: [{ type: SEARCH_TOOL(model), name: "web_search", max_uses: AI_MAX_SEARCHES } as Anthropic.ToolUnion] }),
          messages,
        })
        .finalMessage();

      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      if (message.stop_reason === "refusal") throw new Error("Claude từ chối giải đề này (bộ lọc an toàn)");
      if (message.stop_reason === "max_tokens") throw new Error("Câu trả lời của Claude bị cắt vì quá dài");

      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!text) throw new Error("Claude không trả lời");
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Claude trả về dữ liệu không đúng định dạng");
      }
    }
    throw new Error("Claude tra cứu quá lâu, đã dừng");
  } catch (err) {
    throw new Error(describe(err));
  }
}

// Đổi lỗi của SDK thành lời nhắn tiếng Việt cho admin (lưu vào báo cáo và log)
function describe(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Khóa Anthropic không hợp lệ (401)";
  if (err instanceof Anthropic.PermissionDeniedError) return "Khóa Anthropic không có quyền dùng model này (403)";
  if (err instanceof Anthropic.NotFoundError) return `Model không tồn tại hoặc tài khoản chưa được dùng (404): ${err.message}`;
  if (err instanceof Anthropic.RateLimitError) return "Hết hạn mức Anthropic hoặc gọi quá nhanh (429), thử lại sau ít phút";
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "Claude phản hồi quá lâu";
  if (err instanceof Anthropic.APIConnectionError) return `Không kết nối được Anthropic: ${err.message}`;
  if (err instanceof Anthropic.APIError && /credit balance/i.test(err.message)) return "Tài khoản Anthropic hết credit, cần nạp thêm ở Plans & Billing";
  if (err instanceof Anthropic.APIError) return `Anthropic trả lỗi ${err.status ?? ""}: ${err.message}`;
  return err instanceof Error ? err.message : "Lỗi không xác định khi gọi Claude";
}
