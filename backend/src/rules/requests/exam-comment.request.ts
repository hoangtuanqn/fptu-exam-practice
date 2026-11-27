import { z } from "zod";
import {
  EXAM_COMMENT_BULK_MAX,
  EXAM_COMMENT_MAX_LENGTH,
  EXAM_COMMENT_MAX_LINES,
  EXAM_COMMENT_MENTION_QUERY_MAX,
  EXAM_COMMENT_MENTION_SEARCH_DEFAULT,
  EXAM_COMMENT_MENTION_SEARCH_MAX,
  EXAM_COMMENT_MENTIONS_MAX,
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

// Mục được bình luận/thích: số câu (>= 1), -id của tệp đính kèm hoặc 0 = cả đề (decision 0019); trong khoảng INT của MySQL.
// 0 chỉ có bình luận: thích/bình chọn trả 422 ở service
const INT_MAX = 2_147_483_647;
const target = (n: z.ZodNumber) => n.int("Câu không hợp lệ").min(-INT_MAX, "Câu không hợp lệ").max(INT_MAX, "Câu không hợp lệ");

// Người được nhắc: các ref lấy từ GET /exams/:id/mentions (id một bình luận của người đó). Ref sai bị bỏ qua ở service, không báo lỗi
const mentions = z
  .array(z.string("Người được nhắc không hợp lệ").max(64, "Người được nhắc không hợp lệ"), "Người được nhắc không hợp lệ")
  .max(EXAM_COMMENT_MENTIONS_MAX, `Mỗi bình luận nhắc tối đa ${EXAM_COMMENT_MENTIONS_MAX} người`);

export const createCommentBody = z.object({
  questionNumber: target(z.number("Câu không hợp lệ")),
  body: commentBody,
  replyToId: uuidSchema.optional(), // trả lời bình luận này (cùng đề, cùng câu)
  mentions: mentions.optional(),
});

/**
 * Cùng bình luận gửi dạng multipart/form-data (có tệp ở trường "files"): mọi trường là chuỗi. questionNumber là số nguyên viết bằng chữ số;
 * replyToId rỗng = không trả lời; mentions là trường lặp lại (mỗi trường một ref) hoặc một trường chứa mảng JSON.
 */
export const createCommentForm = createCommentBody.extend({
  questionNumber: z
    .string("Câu không hợp lệ")
    .regex(/^-?\d{1,10}$/, "Câu không hợp lệ")
    .transform(Number)
    .pipe(target(z.number())),
  replyToId: z.preprocess((v) => (v === "" ? undefined : v), uuidSchema.optional()),
  mentions: z.preprocess((v) => {
    if (v === undefined || v === "") return undefined;
    const list: unknown[] = Array.isArray(v) ? v : [v];
    if (list.length === 1 && typeof list[0] === "string" && list[0].trimStart().startsWith("[")) {
      try {
        return JSON.parse(list[0]);
      } catch {
        return null; // lỗi định dạng: báo "không hợp lệ"
      }
    }
    return list;
  }, mentions.optional()),
});

// Gợi ý nhắc tên trong một đề
export const mentionsQuery = z.object({
  q: z.string().trim().max(EXAM_COMMENT_MENTION_QUERY_MAX, "Từ khoá quá dài").default(""),
  limit: z.coerce.number("Số lượng không hợp lệ").int("Số lượng không hợp lệ").min(1, "Số lượng không hợp lệ").max(EXAM_COMMENT_MENTION_SEARCH_MAX, "Số lượng không hợp lệ").default(EXAM_COMMENT_MENTION_SEARCH_DEFAULT),
});

// Tệp đính kèm của bình luận (link ký, không cần đăng nhập; e, s đọc thẳng từ query)
export const commentFileParam = z.object({ id: uuidSchema, fileId: uuidSchema });

// Danh sách trả lời của một bình luận gốc
export const listRepliesQuery = paginationQuery;

// Cảm xúc trên bình luận: thích, không thích, hoặc null = bỏ
export const reactionBody = z.object({ reaction: z.enum(["like", "dislike"], "Cảm xúc không hợp lệ").nullable() });

export const listCommentsQuery = paginationQuery.extend({
  question: target(z.coerce.number("Câu không hợp lệ")),
  order: z.enum(["newest", "oldest"], "Thứ tự không hợp lệ").default("newest"), // bình luận gốc; thảo luận chung của đề dùng oldest
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
export type MentionsQuery = z.infer<typeof mentionsQuery>;
export type CommentFileParam = z.infer<typeof commentFileParam>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuery>;
export type CommentParam = z.infer<typeof commentParam>;
export type QuestionParam = z.infer<typeof questionParam>;
export type ListRepliesQuery = z.infer<typeof listRepliesQuery>;
export type ReactionBody = z.infer<typeof reactionBody>;
export type VoteBody = z.infer<typeof voteBody>;
export type LikeBody = z.infer<typeof likeBody>;
export type ReportCommentBody = z.infer<typeof reportCommentBody>;
export type ListAdminCommentsQuery = z.infer<typeof listAdminCommentsQuery>;
export type ReviewCommentBody = z.infer<typeof reviewCommentBody>;
export type BulkReviewCommentsBody = z.infer<typeof bulkReviewCommentsBody>;
