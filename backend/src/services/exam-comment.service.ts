import {
  EXAM_COMMENT_DUPLICATE_WINDOW_MS,
  EXAM_COMMENT_NOTICE_THROTTLE_MS,
  EXAM_COMMENT_OWN_PENDING_MAX,
  EXAM_COMMENT_PER_DAY,
} from "../constants/exam-comment";
import { HTTP_STATUS } from "../constants/httpStatus";
import { answerReportRepository } from "../repositories/answer-report.repository";
import { examCommentRepository, type AdminCommentRow, type PublicCommentRow } from "../repositories/exam-comment.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { BulkReviewCommentsBody, CreateCommentBody, ListAdminCommentsQuery, ListCommentsQuery, ReviewCommentBody } from "../rules/requests/exam-comment.request";
import type { Actor } from "../utils/actor";
import { fileUrlOf } from "../utils/file-url";
import { toMeta } from "../utils/pagination";
import { adminNoticeService } from "./admin-notice.service";
import { examService } from "./exam.service";

type CommentKey = { examId: string; questionNumber: number; body: string };

const COMMENT_NOT_FOUND = "Không tìm thấy bình luận này, có thể nó đã bị xoá.";
const sameText = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");

/**
 * Quy tắc gửi bình luận trên các bình luận của người đó trong 24 giờ qua (tối đa EXAM_COMMENT_PER_DAY dòng, đủ để quyết định cả hai):
 * đã đủ số trong ngày -> "daily"; cùng câu, cùng nội dung -> "duplicate".
 */
export function commentLimitError(recent: readonly CommentKey[], next: CommentKey, perDay = EXAM_COMMENT_PER_DAY): "daily" | "duplicate" | null {
  if (recent.length >= perDay) return "daily";
  if (recent.some((r) => r.examId === next.examId && r.questionNumber === next.questionNumber && sameText(r.body, next.body))) return "duplicate";
  return null;
}

// Ảnh đại diện lưu theo tên avatars/<userId>-...: ảnh cũ còn mang id người dùng thì không trả ra (danh sách công khai không lộ id)
const avatarUrlOf = (userId: string, avatarPath: string | null) => (avatarPath && !avatarPath.includes(userId) ? fileUrlOf(avatarPath) : null);

/** Một dòng bình luận cho người xem: không có id/email người viết, `mine` cho biết có phải của người xem không. */
export const toPublicComment = (row: PublicCommentRow, viewerId: string | null) => ({
  id: row.id,
  questionNumber: row.questionNumber,
  body: row.body,
  status: row.status,
  createdAt: row.createdAt,
  author: { name: row.user.fullName, avatarUrl: avatarUrlOf(row.userId, row.user.avatarPath) },
  mine: viewerId !== null && row.userId === viewerId,
});

// shortcut: chống báo trùng giữ trong bộ nhớ (mất khi khởi động lại, chỉ là báo thêm một lần); một tiến trình PM2 nên đủ
const lastNotice = new Map<string, number>();
function notifyAdmins(userId: string, examId: string, questionNumber: number, body: string) {
  const last = lastNotice.get(examId);
  if (last && Date.now() - last < EXAM_COMMENT_NOTICE_THROTTLE_MS) return;
  if (lastNotice.size > 500) lastNotice.clear();
  lastNotice.set(examId, Date.now());
  adminNoticeService.push("comment.created", {
    title: `Bình luận mới chờ duyệt (câu ${questionNumber})`,
    body: body.slice(0, 200),
    userId,
    link: "/admin/exam-comments",
  });
}

// Dòng của admin: gắn ảnh câu hỏi (một truy vấn cho cả trang), user -> author; examId đã có trong exam.id nên bỏ
async function withImages(rows: AdminCommentRow[]) {
  const images = await answerReportRepository.questionImages(rows.map((c) => ({ examId: c.examId, number: c.questionNumber })));
  const imageOf = new Map(images.map((i) => [`${i.examId}:${i.number}`, fileUrlOf(i.imagePath)]));
  return rows.map(({ examId, user, ...c }) => ({ ...c, author: user, imageUrl: imageOf.get(`${examId}:${c.questionNumber}`) ?? null }));
}

export const examCommentService = {
  // ----- Người xem (khách hoặc thành viên); đề phải nằm trong kho của người xem như mọi API đề khác
  async list(actor: Actor, viewerId: string | null, examId: string, { question, ...page }: ListCommentsQuery) {
    await examService.assertAccess(actor, examId);
    const [{ items, total }, own] = await Promise.all([
      examCommentRepository.listApproved(examId, question, page),
      // Bình luận chưa duyệt của chính mình chỉ hiện ở đầu trang 1 (không tính vào total)
      viewerId && page.page === 1 ? examCommentRepository.listOwnUnapproved(examId, question, viewerId, EXAM_COMMENT_OWN_PENDING_MAX) : [],
    ]);
    return { items: [...own, ...items].map((r) => toPublicComment(r, viewerId)), meta: toMeta(page, total) };
  },

  async counts(actor: Actor, examId: string) {
    await examService.assertAccess(actor, examId);
    const rows = await examCommentRepository.countApprovedByQuestion(examId);
    return { counts: Object.fromEntries(rows.map((r) => [String(r.questionNumber), r._count._all])) };
  },

  async create(actor: Actor, userId: string, examId: string, { questionNumber, body }: CreateCommentBody) {
    await examService.assertAccess(actor, examId);
    if (!(await examRepository.findQuestionAnswer(examId, questionNumber))) {
      throw new AppError("Đề này không có câu bạn chọn", HTTP_STATUS.UNPROCESSABLE_ENTITY, { questionNumber: "Câu không tồn tại trong đề" });
    }
    const recent = await examCommentRepository.recentByUser(userId, new Date(Date.now() - EXAM_COMMENT_DUPLICATE_WINDOW_MS), EXAM_COMMENT_PER_DAY);
    const limit = commentLimitError(recent, { examId, questionNumber, body });
    if (limit === "daily") throw new AppError("Hôm nay bạn đã bình luận quá nhiều, vui lòng quay lại sau", HTTP_STATUS.TOO_MANY_REQUESTS);
    if (limit === "duplicate") throw AppError.conflict("Bạn đã gửi bình luận này cho câu này rồi", { body: "Bình luận bị trùng" });

    const row = await examCommentRepository.create({ examId, questionNumber, userId, body });
    notifyAdmins(userId, examId, questionNumber, body);
    return toPublicComment(row, userId);
  },

  // Người viết xoá bình luận của mình (mọi trạng thái); không phải của mình thì 404 như không tồn tại
  async removeOwn(userId: string, examId: string, commentId: string) {
    if ((await examCommentRepository.deleteOwn(commentId, examId, userId)) === 0) throw AppError.notFound(COMMENT_NOT_FOUND);
    return { id: commentId, deleted: true };
  },

  // ----- Admin
  async adminList({ status, q, ...page }: ListAdminCommentsQuery) {
    const { items, total } = await examCommentRepository.listAdmin(page, status === "all" ? undefined : status, q || undefined);
    return { items: await withImages(items), meta: toMeta(page, total) };
  },

  adminSummary: async () => ({ pending: await examCommentRepository.countPending() }),

  /** Duyệt hoặc từ chối (gọi lại với cùng trạng thái không đổi kết quả). Trả về đúng dạng một dòng của danh sách admin. */
  async review(adminId: string, id: string, { status, note }: ReviewCommentBody) {
    if ((await examCommentRepository.review([id], { status, reviewedById: adminId, reviewNote: note || null })) === 0) throw AppError.notFound(COMMENT_NOT_FOUND);
    const row = await examCommentRepository.findAdmin(id);
    if (!row) throw AppError.notFound(COMMENT_NOT_FOUND);
    return (await withImages([row]))[0]!;
  },

  async bulkReview(adminId: string, { ids, status }: BulkReviewCommentsBody) {
    return { updated: await examCommentRepository.review([...new Set(ids)], { status, reviewedById: adminId, reviewNote: null }) };
  },

  async adminRemove(id: string) {
    if ((await examCommentRepository.deleteById(id)) === 0) throw AppError.notFound(COMMENT_NOT_FOUND);
    return { id, deleted: true };
  },
};
