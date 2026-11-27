import { z } from "zod";
import {
  EXAM_COMMENT_BULK_MAX,
  EXAM_COMMENT_MAX_LENGTH,
  EXAM_COMMENT_MAX_LINES,
  EXAM_COMMENT_REPORT_REASON_MAX,
  EXAM_VOTE_LETTERS,
} from "../../constants/exam-comment";
import { paginationQuery } from "../../utils/pagination";
import { uuidSchema } from "./admin.request";

/**
 * Chuẩn hoá nội dung bình luận (văn bản thuần): xuống dòng về \n, bỏ ký tự điều khiển và ký tự đảo chiều chữ (giữ \n và tab),
 * gộp nhiều dòng trống, bỏ khoảng trắng đầu/cuối. Không bao giờ xử lý như HTML: giao diện hiển thị dạng text.
 */
export const cleanCommentBody = (raw: string) =>
  raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const commentBody = z
  .string("Vui lòng nhập nội dung bình luận")
  .max(EXAM_COMMENT_MAX_LENGTH * 4, `Bình luận tối đa ${EXAM_COMMENT_MAX_LENGTH} ký tự`) // chặn chuỗi quá dài trước khi xử lý
  .transform(cleanCommentBody)
  .pipe(
    z
      .string()
      .min(1, "Vui lòng nhập nội dung bình luận")
      .max(EXAM_COMMENT_MAX_LENGTH, `Bình luận tối đa ${EXAM_COMMENT_MAX_LENGTH} ký tự`)
      .refine((s) => s.split("\n").length <= EXAM_COMMENT_MAX_LINES, "Bình luận có quá nhiều dòng, bạn viết gọn lại nhé"),
  );

// Mục được bình luận/thích: số câu (>= 1) hoặc -id của tệp đính kèm (decision 0019); trong khoảng INT của MySQL, khác 0
const INT_MAX = 2_147_483_647;
const target = (n: z.ZodNumber) =>
  n.int("Câu không hợp lệ").min(-INT_MAX, "Câu không hợp lệ").max(INT_MAX, "Câu không hợp lệ").refine((v) => v !== 0, "Câu không hợp lệ");

export const createCommentBody = z.object({
  questionNumber: target(z.number("Câu không hợp lệ")),
  body: commentBody,
});

export const listCommentsQuery = paginationQuery.extend({
  question: target(z.coerce.number("Câu không hợp lệ")),
});

export const commentParam = z.object({ id: uuidSchema, commentId: uuidSchema });
export const questionParam = z.object({ id: uuidSchema, number: target(z.coerce.number("Câu không hợp lệ")) });
// Bình chọn chỉ có ở câu hỏi thật (tệp đính kèm không có)
export const voteParam = z.object({ id: uuidSchema, number: z.coerce.number("Câu không hợp lệ").int("Câu không hợp lệ").min(1, "Câu không hợp lệ").max(INT_MAX, "Câu không hợp lệ") });

// Bình chọn đáp án: các chữ A-H, mảng rỗng = bỏ phiếu; lưu đã bỏ trùng và sắp xếp
export const voteBody = z.object({
  answers: z
    .array(z.enum(EXAM_VOTE_LETTERS, "Đáp án không hợp lệ"), "Đáp án không hợp lệ")
    .max(EXAM_VOTE_LETTERS.length, "Đáp án không hợp lệ")
    .transform((a) => [...new Set(a)].sort()),
});

export const likeBody = z.object({ liked: z.boolean("Giá trị không hợp lệ") });

// Lý do báo cáo không bắt buộc (gửi không có body cũng được)
export const reportCommentBody = z
  .object({
    reason: z
      .string()
      .max(EXAM_COMMENT_REPORT_REASON_MAX, `Lý do tối đa ${EXAM_COMMENT_REPORT_REASON_MAX} ký tự`)
      .transform((r) => cleanCommentBody(r) || null)
      .optional(),
  })
  .default({});

// Admin
export const reviewStatus = z.enum(["APPROVED", "REJECTED"], "Trạng thái không hợp lệ");

export const listAdminCommentsQuery = paginationQuery.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "REPORTED", "all"]).default("PENDING"),
  q: z.string().trim().max(100).optional(),
});

export const reviewCommentBody = z.object({
  status: reviewStatus,
  note: z.string().trim().max(255, "Ghi chú tối đa 255 ký tự").optional(),
});

export const bulkReviewCommentsBody = z.object({
  ids: z.array(uuidSchema).min(1, "Chưa chọn bình luận nào").max(EXAM_COMMENT_BULK_MAX, `Chọn tối đa ${EXAM_COMMENT_BULK_MAX} bình luận mỗi lần`),
  status: reviewStatus,
});

export type CreateCommentBody = z.infer<typeof createCommentBody>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuery>;
export type CommentParam = z.infer<typeof commentParam>;
export type QuestionParam = z.infer<typeof questionParam>;
export type VoteBody = z.infer<typeof voteBody>;
export type LikeBody = z.infer<typeof likeBody>;
export type ReportCommentBody = z.infer<typeof reportCommentBody>;
export type ListAdminCommentsQuery = z.infer<typeof listAdminCommentsQuery>;
export type ReviewCommentBody = z.infer<typeof reviewCommentBody>;
export type BulkReviewCommentsBody = z.infer<typeof bulkReviewCommentsBody>;
