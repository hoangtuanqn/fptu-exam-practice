import { z } from "zod";

export const explainBody = z.object({
  examId: z.number("Đề không hợp lệ").int().positive(),
  questionNumber: z.number("Câu không hợp lệ").int().positive(),
});

export const examIdParam = z.object({ examId: z.coerce.number().int().positive() });

export type ExplainBody = z.infer<typeof explainBody>;
export type ExamIdParam = z.infer<typeof examIdParam>;
