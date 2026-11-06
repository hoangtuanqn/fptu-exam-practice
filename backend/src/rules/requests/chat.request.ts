import { z } from "zod";
import { CHAT_MAX_INPUT_CHARS } from "../../constants/chat";

export const chatBody = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().transform((v) => v.normalize("NFC")).pipe(z.string().trim().min(1, "Vui lòng nhập câu hỏi").max(CHAT_MAX_INPUT_CHARS * 4, "Tin nhắn quá dài")), // chuẩn hoá Unicode về NFC: chữ có dấu gõ kiểu tổ hợp (NFD) vẫn khớp
      }),
    )
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1]!.role === "user", "Tin cuối cùng phải là của người dùng")
    // Câu hỏi mới nhất giới hạn chặt hơn: đây là phần tốn token và được dùng để tìm kiếm
    .refine((m) => m[m.length - 1]!.content.length <= CHAT_MAX_INPUT_CHARS, `Câu hỏi tối đa ${CHAT_MAX_INPUT_CHARS} ký tự`),
});

export const updateChatSettingsBody = z.object({
  enabled: z.boolean().optional(),
  geminiApiKey: z.string().trim().max(300).optional(),
  clearGeminiKey: z.boolean().optional(),
  claudeModel: z.string().trim().min(1).max(80).optional(),
});

export type ChatBody = z.infer<typeof chatBody>;
export type UpdateChatSettingsBody = z.infer<typeof updateChatSettingsBody>;
