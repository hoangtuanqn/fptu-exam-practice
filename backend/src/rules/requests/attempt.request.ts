import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";

const option = z.string().regex(/^[A-Z]$/, "Đáp án không hợp lệ");

// { "1": ["A"], "2": ["A","C"] }: số câu -> các đáp án đã chọn
const answers = z
  .record(z.string().regex(/^\d{1,4}$/), z.array(option).max(8))
  .refine((v) => Object.keys(v).length <= 500, "Quá nhiều câu");

export const submitAttemptBody = z.object({
  mode: z.enum(["PRACTICE", "EXAM"]),
  durationSec: z.number().int().min(0).max(24 * 3600),
  answers,
});

export const listAttemptsQuery = paginationQuery.extend({
  examId: z.coerce.number().int().positive().optional(),
});

export const attemptSummaryQuery = z.object({ examId: z.coerce.number().int().positive() });

export const threadParam = z.object({ threadId: z.string().regex(/^\d{1,18}$/, "Mã đề không hợp lệ") });

export type ThreadParam = z.infer<typeof threadParam>;
export type SubmitAttemptBody = z.infer<typeof submitAttemptBody>;
export type AttemptSummaryQuery = z.infer<typeof attemptSummaryQuery>;
export type ListAttemptsQuery = z.infer<typeof listAttemptsQuery>;
