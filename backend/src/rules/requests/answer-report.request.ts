import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { uuidSchema } from "./admin.request";

// Lọc theo trạng thái "đã giải quyết" của admin: "true" | "false", rỗng = tất cả
export const resolvedFilter = z.enum(["true", "false", ""]).optional();

// Đáp án đề xuất: các chữ cái A-Z cách nhau dấu cách (A hoặc A C D). Gõ liền "ACD" cũng được chuẩn hóa.
const proposedAnswer = z
  .string("Vui lòng chọn đáp án đúng")
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]( ?[A-Z]){0,7}$/, "Đáp án không hợp lệ");

export const createReportBody = z.object({
  examId: uuidSchema,
  questionNumber: z.number("Câu không hợp lệ").int().positive(),
  proposedAnswer,
  reason: z.string("Vui lòng nhập lý do").trim().min(10, "Lý do tối thiểu 10 ký tự").max(1000, "Lý do tối đa 1000 ký tự"),
});

export const listReportsQuery = paginationQuery.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  resolved: resolvedFilter,
  q: z.string().trim().max(100).optional(), // tên đề hoặc email/tên người báo cáo
});

export const reviewReportBody = z.object({
  note: z.string().trim().max(300, "Ghi chú tối đa 300 ký tự").optional(),
});

export type CreateReportBody = z.infer<typeof createReportBody>;
export type ListReportsQuery = z.infer<typeof listReportsQuery>;
export type ReviewReportBody = z.infer<typeof reviewReportBody>;
