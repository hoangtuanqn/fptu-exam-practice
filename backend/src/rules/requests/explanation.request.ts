import { z } from "zod";

export const explainBody = z.object({
  examId: z.number("Đề không hợp lệ").int().positive(),
  questionNumber: z.number("Câu không hợp lệ").int().positive(),
  useFreeTurn: z.boolean().optional(), // dùng 1 lượt giải thích miễn phí (nhận từ vượt link) thay vì trả credit
});

// price: giá gói người dùng đang thấy; lệch với giá hiện tại của máy chủ thì từ chối (không bao giờ trừ nhiều hơn số đã hiển thị)
export const unlockBody = z.object({ examId: z.number("Đề không hợp lệ").int().positive(), price: z.number("Giá không hợp lệ").int().min(0) });

export const examIdParam = z.object({ examId: z.coerce.number().int().positive() });

export type ExplainBody = z.infer<typeof explainBody>;
export type UnlockBody = z.infer<typeof unlockBody>;
export type ExamIdParam = z.infer<typeof examIdParam>;
