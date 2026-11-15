import { z } from "zod";
import { CHAT_MAX_INPUT_CHARS, CHAT_PROVIDERS } from "../../constants/chat";
import { parseExtraHeader } from "../../utils/http-header";

// Gốc API của endpoint ngoài: chỉ https, không kèm tài khoản/mật khẩu, query hay #; bỏ "/" cuối. Chuỗi rỗng = xoá.
const isSafeBaseUrl = (v: string) => {
  if (v === "") return true;
  if (/[?#]/.test(v)) return false; // cả "?" hay "#" trống (URL bỏ qua) cũng không nhận
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash;
  } catch {
    return false;
  }
};

export const chatBody = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().transform((v) => v.normalize("NFC")).pipe(z.string().trim().min(1, "Vui lòng nhập câu hỏi").max(CHAT_MAX_INPUT_CHARS * 4, "Tin nhắn quá dài, hãy rút gọn rồi gửi lại")), // chuẩn hoá Unicode về NFC: chữ có dấu gõ kiểu tổ hợp (NFD) vẫn khớp
      }),
    )
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1]!.role === "user", "Tin cuối cùng phải là của người dùng")
    // Câu hỏi mới nhất giới hạn chặt hơn: đây là phần tốn token và được dùng để tìm kiếm
    .refine((m) => m[m.length - 1]!.content.length <= CHAT_MAX_INPUT_CHARS, `Câu hỏi tối đa ${CHAT_MAX_INPUT_CHARS} ký tự`),
  captchaToken: z.string().max(2048).optional(), // token Turnstile khi hết một đợt tin nhắn trong ngày
});

export const updateChatSettingsBody = z.object({
  enabled: z.boolean().optional(),
  openaiApiKey: z.string().trim().max(300).optional(),
  clearOpenaiKey: z.boolean().optional(),
  claudeModel: z.string().trim().min(1).max(80).optional(),
  chatProvider: z.enum(CHAT_PROVIDERS).optional(),
  chatBaseUrl: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v.replace(/\/+$/, ""))
    .refine(isSafeBaseUrl, "Địa chỉ API phải là https, không chứa tài khoản, mật khẩu hay tham số")
    .optional(),
  chatModel: z.string().trim().max(120).regex(/^[^\s]*$/, "Tên model không chứa khoảng trắng").optional(),
  chatApiKey: z.string().trim().max(500).regex(/^[\x21-\x7E]*$/, "Khóa API chỉ gồm ký tự ASCII, không có khoảng trắng").optional(), // "" = giữ khoá cũ
  clearChatKey: z.boolean().optional(),
  chatExtraHeader: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || parseExtraHeader(v) !== null, "Header phải có dạng Tên: giá trị (một dòng, không dùng các header hệ thống)")
    .optional(),
});

export type ChatBody = z.infer<typeof chatBody>;
export type UpdateChatSettingsBody = z.infer<typeof updateChatSettingsBody>;
