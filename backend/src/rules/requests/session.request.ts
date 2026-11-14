import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { violations } from "./violation.request";

const option = z.string().regex(/^[A-Z]$/, "Đáp án không hợp lệ");
const questionNumber = z.string().regex(/^\d{1,4}$/);
const tooMany = "Quá nhiều câu";

// Trạng thái làm bài: số câu -> các đáp án đã chọn / đã chốt / đã đánh dấu
const answers = z.record(questionNumber, z.array(option).max(8)).refine((v) => Object.keys(v).length <= 500, tooMany);
const flags = z.record(questionNumber, z.boolean()).refine((v) => Object.keys(v).length <= 500, tooMany);

export const createSessionBody = z.object({ mode: z.enum(["PRACTICE", "EXAM"]) });

export const saveSessionBody = z.object({
  answers,
  checked: flags,
  flagged: flags,
  current: z.number().int().min(0).max(1000),
  elapsedSec: z.number().int().min(0).max(24 * 3600),
  submitted: z.boolean().optional(),
  violations: violations.optional(), // vắng = giữ nguyên cột (client cũ không gửi)
});

export const listSessionsQuery = paginationQuery.extend({
  examId: z.coerce.number().int().positive().optional(),
});

export type CreateSessionBody = z.infer<typeof createSessionBody>;
export type SaveSessionBody = z.infer<typeof saveSessionBody>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuery>;
