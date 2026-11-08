import { z } from "zod";
import { ASK_MAX_CHARS, ASK_MAX_MESSAGES } from "../../constants/ask";

export const askBody = z.object({
  examId: z.number("Đề không hợp lệ").int().positive(),
  questionNumber: z.number("Câu không hợp lệ").int().positive(),
  sessionId: z.number("Lượt làm bài không hợp lệ").int().positive(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1, "Bạn chưa nhập câu hỏi").max(ASK_MAX_CHARS * 4) }))
    .min(1)
    .max(ASK_MAX_MESSAGES)
    .refine((m) => m[m.length - 1]!.role === "user", "Tin cuối phải là câu hỏi của bạn")
    .refine((m) => m[m.length - 1]!.content.length <= ASK_MAX_CHARS, `Câu hỏi tối đa ${ASK_MAX_CHARS} ký tự`),
});

export type AskBody = z.infer<typeof askBody>;
