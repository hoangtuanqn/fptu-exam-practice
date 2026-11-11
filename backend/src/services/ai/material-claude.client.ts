import Anthropic from "@anthropic-ai/sdk";
import { MATERIAL_AI_MAX_RETRIES, MATERIAL_AI_TIMEOUT_MS } from "../../constants/materials";

// Lượt gọi Claude của tính năng phân tích slide: một tin nhắn, không suy luận (thinking), kết quả JSON theo schema.
// Tách sau một interface để test thay bằng client giả; KHÔNG dùng claude.client.ts (gọi kiểu adaptive thinking, chưa chắc Haiku hỗ trợ).

export type MaterialContent = { type: "text"; text: string } | { type: "image"; mediaType: "image/png"; data: string /* base64 */ };

export interface MaterialClaudeRequest {
  model: string;
  maxTokens: number;
  system: string;
  schema: Record<string, unknown>;
  content: MaterialContent[];
}

export interface MaterialUsage {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

export interface MaterialClaudeResponse {
  text: string; // phần chữ (JSON theo schema, chưa parse)
  usage: MaterialUsage;
  stopReason: string | null;
}

export interface MaterialClaudeClient {
  call(req: MaterialClaudeRequest): Promise<MaterialClaudeResponse>;
}

/** Token tính vào giới hạn: vào + ra + ghi cache (đọc cache không tính). */
export const billableTokens = (u: MaterialUsage) => u.input + u.output + u.cacheCreation;

/** Lỗi gọi Claude: `message` chỉ dùng cho log (không chứa khoá), người dùng chỉ thấy thông báo chung. */
export class MaterialAiError extends Error {}

export function createMaterialClaudeClient(apiKey: string): MaterialClaudeClient {
  const client = new Anthropic({ apiKey, timeout: MATERIAL_AI_TIMEOUT_MS, maxRetries: MATERIAL_AI_MAX_RETRIES });
  return {
    async call(req) {
      try {
        const msg = await client.messages.create({
          model: req.model,
          max_tokens: req.maxTokens,
          system: req.system,
          output_config: { format: { type: "json_schema", schema: req.schema } },
          messages: [
            {
              role: "user",
              content: req.content.map((c) =>
                c.type === "text" ? { type: "text" as const, text: c.text } : { type: "image" as const, source: { type: "base64" as const, media_type: c.mediaType, data: c.data } },
              ),
            },
          ],
        });
        const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
        const u = msg.usage;
        return {
          text,
          stopReason: msg.stop_reason ?? null,
          usage: { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheCreation: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0 },
        };
      } catch (err) {
        // Chỉ giữ loại lỗi và mã trạng thái cho log; không bao giờ đưa khoá hay nội dung request vào lời nhắn
        const status = err instanceof Anthropic.APIError ? ` ${err.status ?? ""}` : "";
        throw new MaterialAiError(`Anthropic${status}: ${err instanceof Error ? err.constructor.name : "error"}`);
      }
    },
  };
}
