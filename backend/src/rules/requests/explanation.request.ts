import { z } from "zod";
import { CHAT_ASSISTANT_MAX_CHARS, CHAT_MAX_MESSAGES, CHAT_MESSAGE_MAX_CHARS } from "../../constants/ai";

export const explainBody = z.object({
  examId: z.number("Đề không hợp lệ").int().positive(),
  questionNumber: z.number("Câu không hợp lệ").int().positive(),
  useFreeTurn: z.boolean().optional(), // dùng 1 lượt giải thích miễn phí (nhận từ vượt link) thay vì trả credit
});

// price: giá gói người dùng đang thấy; lệch với giá hiện tại của máy chủ thì từ chối (không bao giờ trừ nhiều hơn số đã hiển thị)
export const unlockBody = z.object({ examId: z.number("Đề không hợp lệ").int().positive(), price: z.number("Giá không hợp lệ").int().min(0) });

// Hỏi AI về một câu: chỉ văn bản (strict: không nhận ảnh hay trường lạ), tin cuối là câu hỏi của người học
const chatMessage = z
  .object({
    role: z.enum(["user", "assistant"], "Vai trò tin nhắn không hợp lệ"),
    content: z.string("Tin nhắn phải là văn bản").trim().min(1, "Tin nhắn trống").max(CHAT_ASSISTANT_MAX_CHARS, "Tin nhắn quá dài"),
  })
  .strict()
  // Giới hạn ngắn chỉ áp cho tin của người học; lời AI trong lịch sử có thể dài hơn
  .refine((m) => m.role !== "user" || m.content.length <= CHAT_MESSAGE_MAX_CHARS, { message: `Mỗi tin nhắn tối đa ${CHAT_MESSAGE_MAX_CHARS} ký tự`, path: ["content"] });

export const explainChatBody = z
  .object({
    examId: z.number("Đề không hợp lệ").int().positive(),
    questionNumber: z.number("Câu không hợp lệ").int().positive(),
    messages: z
      .array(chatMessage, "Hội thoại không hợp lệ")
      .min(1, "Hãy nhập câu hỏi")
      .max(CHAT_MAX_MESSAGES, `Hội thoại tối đa ${CHAT_MAX_MESSAGES} tin nhắn, hãy bắt đầu cuộc trò chuyện mới`)
      .refine((m) => m.at(-1)?.role === "user", "Tin nhắn cuối phải là câu hỏi của bạn"),
  })
  .strict();

export const examIdParam = z.object({ examId: z.coerce.number().int().positive() });

export type ExplainBody = z.infer<typeof explainBody>;
export type UnlockBody = z.infer<typeof unlockBody>;
export type ExplainChatBody = z.infer<typeof explainChatBody>;
export type ExamIdParam = z.infer<typeof examIdParam>;
