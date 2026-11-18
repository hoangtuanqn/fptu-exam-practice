import { z } from "zod";
import { EXAM_COMMENT_BULK_MAX, EXAM_COMMENT_MAX_LENGTH } from "../../constants/exam-comment";
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
  .pipe(z.string().min(1, "Vui lòng nhập nội dung bình luận").max(EXAM_COMMENT_MAX_LENGTH, `Bình luận tối đa ${EXAM_COMMENT_MAX_LENGTH} ký tự`));

export const createCommentBody = z.object({
  questionNumber: z.number("Câu không hợp lệ").int("Câu không hợp lệ").min(1, "Câu không hợp lệ"),
  body: commentBody,
});

export const listCommentsQuery = paginationQuery.extend({
  question: z.coerce.number("Câu không hợp lệ").int("Câu không hợp lệ").min(1, "Câu không hợp lệ"),
});

export const commentParam = z.object({ id: uuidSchema, commentId: uuidSchema });

// Admin
export const reviewStatus = z.enum(["APPROVED", "REJECTED"], "Trạng thái không hợp lệ");

export const listAdminCommentsQuery = paginationQuery.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "all"]).default("PENDING"),
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
export type ListAdminCommentsQuery = z.infer<typeof listAdminCommentsQuery>;
export type ReviewCommentBody = z.infer<typeof reviewCommentBody>;
export type BulkReviewCommentsBody = z.infer<typeof bulkReviewCommentsBody>;
