import {
  EXAM_COMMENT_AUTO_HIDE_REPORTS,
  EXAM_COMMENT_DUPLICATE_WINDOW_MS,
  EXAM_COMMENT_NEW_ACCOUNT_MS,
  EXAM_COMMENT_NEW_ACCOUNT_PER_DAY,
  EXAM_COMMENT_NOTICE_THROTTLE_MS,
  EXAM_COMMENT_OWN_PENDING_MAX,
  EXAM_COMMENT_PER_DAY,
  EXAM_COMMENT_PER_QUESTION_PER_DAY,
  EXAM_COMMENT_REPORTS_PER_DAY,
  EXAM_COMMENT_SPAM_MIN_LENGTH,
  EXAM_COMMENT_SPAM_QUESTIONS,
  EXAM_COMMENT_STRIKE_WINDOW_MS,
  EXAM_COMMENT_STRIKES,
  type CommentFlagReason,
} from "../constants/exam-comment";
import { HTTP_STATUS } from "../constants/httpStatus";
import { answerReportRepository } from "../repositories/answer-report.repository";
import { examCommentRepository, type AdminCommentRow, type PublicCommentRow } from "../repositories/exam-comment.repository";
import { examReactionRepository } from "../repositories/exam-reaction.repository";
import { examAttachmentRepository } from "../repositories/exam-attachment.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type { BulkReviewCommentsBody, CreateCommentBody, ListAdminCommentsQuery, ListCommentsQuery, ReviewCommentBody } from "../rules/requests/exam-comment.request";
import type { Actor } from "../utils/actor";
import { answerLettersOf, moderateComment } from "../utils/comment-text";
import { fileUrlOf, toAttachmentDto } from "../utils/file-url";
import { toMeta } from "../utils/pagination";
import { isProUntil } from "../utils/pro";
import { adminNoticeService } from "./admin-notice.service";
import { examService } from "./exam.service";

const COMMENT_NOT_FOUND = "Không tìm thấy bình luận này, có thể nó đã bị xoá.";
export const COMMENT_BLOCKED_MESSAGE = "Bình luận có từ ngữ không phù hợp, bạn sửa lại nhé";
const sameText = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");

/**
 * Mục được bình luận/thích không có trong đề: cùng một lỗi 422 cho bình luận, bình chọn, thích.
 * Số dương = câu hỏi (ExamQuestion.number), số âm = -id của tệp đính kèm của đề này (decision 0019).
 */
export async function assertQuestion(examId: string, questionNumber: number) {
  const found = questionNumber > 0 ? await examRepository.findQuestionAnswer(examId, questionNumber) : await examAttachmentRepository.find(examId, -questionNumber);
  if (!found) {
    throw new AppError("Đề này không có câu bạn chọn", HTTP_STATUS.UNPROCESSABLE_ENTITY, { questionNumber: "Câu không tồn tại trong đề" });
  }
}

/**
 * Giới hạn gửi trong 24 giờ: `today` = số bình luận của người đó, `onQuestion` = nội dung các bình luận của họ trên câu này
 * (tối đa EXAM_COMMENT_PER_QUESTION_PER_DAY dòng), `newAccount` = tài khoản mới tạo.
 */
export function commentLimitError(c: { today: number; onQuestion: readonly string[]; newAccount: boolean }, body: string): "daily" | "question" | "duplicate" | null {
  if (c.today >= (c.newAccount ? EXAM_COMMENT_NEW_ACCOUNT_PER_DAY : EXAM_COMMENT_PER_DAY)) return "daily";
  if (c.onQuestion.some((b) => sameText(b, body))) return "duplicate";
  if (c.onQuestion.length >= EXAM_COMMENT_PER_QUESTION_PER_DAY) return "question";
  return null;
}

/** Vì sao bình luận phải chờ duyệt (null = hiện ngay): nội dung trước, rồi cùng nội dung ở nhiều câu, rồi bị từ chối nhiều lần. */
export function holdReason(text: CommentFlagReason | null, c: { sameElsewhere: number; strikes: number }): CommentFlagReason | null {
  if (text) return text;
  if (c.sameElsewhere >= EXAM_COMMENT_SPAM_QUESTIONS - 1) return "SPAM";
  if (c.strikes >= EXAM_COMMENT_STRIKES) return "STRIKES";
  return null;
}

// Ảnh đại diện lưu theo tên avatars/<userId>-...: ảnh cũ còn mang id người dùng thì không trả ra (danh sách công khai không lộ id)
const avatarUrlOf = (userId: string, avatarPath: string | null) => (avatarPath && !avatarPath.includes(userId) ? fileUrlOf(avatarPath) : null);

/** Một dòng bình luận cho người xem: không có id/email người viết, không có lý do bị giữ; `mine` = của người xem. */
export const toPublicComment = (row: PublicCommentRow, viewerId: string | null, liked = false) => ({
  id: row.id,
  questionNumber: row.questionNumber,
  body: row.body,
  status: row.status,
  createdAt: row.createdAt,
  author: {
    name: row.user.fullName,
    avatarUrl: avatarUrlOf(row.userId, row.user.avatarPath),
    isPro: isProUntil(row.user.proExpiresAt),
    isAdmin: row.user.role === "ADMIN",
  },
  mine: viewerId !== null && row.userId === viewerId,
  likes: row._count.likes,
  liked,
});

// shortcut: chống báo trùng giữ trong bộ nhớ (mất khi khởi động lại, chỉ là báo thêm một lần); một tiến trình PM2 nên đủ
const lastNotice = new Map<string, number>();
function notifyAdmins(kind: "held" | "reported", userId: string, examId: string, questionNumber: number, body: string) {
  const key = `${kind}:${examId}`; // mỗi loại thông báo có bộ đếm riêng
  const last = lastNotice.get(key);
  if (last && Date.now() - last < EXAM_COMMENT_NOTICE_THROTTLE_MS) return;
  if (lastNotice.size > 500) lastNotice.clear();
  lastNotice.set(key, Date.now());
  adminNoticeService.push("comment.created", {
    title: `${kind === "held" ? "Bình luận chờ duyệt" : "Bình luận bị báo cáo"}: {exam}, câu ${questionNumber}`,
    examId,
    body: body.slice(0, 200),
    userId,
    link: kind === "held" ? "/admin/exam-comments" : "/admin/exam-comments?status=REPORTED",
  });
}

// Dòng của admin: gắn ảnh câu hỏi / tệp đính kèm (một truy vấn mỗi loại cho cả trang), user -> author, số báo cáo đang mở;
// examId đã có trong exam.id nên bỏ. Tệp đính kèm: targetName = tên tệp, imageUrl chỉ khi tệp là ảnh.
async function withImages(rows: AdminCommentRow[]) {
  const [images, files] = await Promise.all([
    answerReportRepository.questionImages(rows.filter((c) => c.questionNumber > 0).map((c) => ({ examId: c.examId, number: c.questionNumber }))),
    examAttachmentRepository.byIds([...new Set(rows.filter((c) => c.questionNumber < 0).map((c) => -c.questionNumber))]),
  ]);
  const imageOf = new Map(images.map((i) => [`${i.examId}:${i.number}`, fileUrlOf(i.imagePath)]));
  const fileOf = new Map(files.map((f) => [`${f.examId}:${-f.id}`, f]));
  return rows.map(({ examId, user, _count, ...c }) => {
    const file = fileOf.get(`${examId}:${c.questionNumber}`);
    return {
      ...c,
      reportCount: _count.reports,
      author: user,
      imageUrl: file ? (file.mime.startsWith("image/") ? toAttachmentDto(examId, file).url : null) : (imageOf.get(`${examId}:${c.questionNumber}`) ?? null),
      targetName: file?.name ?? null,
    };
  });
}

async function approvedComment(actor: Actor, examId: string, commentId: string) {
  await examService.assertAccess(actor, examId);
  const comment = await examCommentRepository.findApproved(commentId, examId);
  if (!comment) throw AppError.notFound(COMMENT_NOT_FOUND);
  return comment;
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
    const rows = [...own, ...items];
    const liked = new Set(viewerId ? await examCommentRepository.likedIds(viewerId, rows.map((r) => r.id)) : []);
    return { items: rows.map((r) => toPublicComment(r, viewerId, liked.has(r.id))), meta: toMeta(page, total) };
  },

  async counts(actor: Actor, examId: string) {
    await examService.assertAccess(actor, examId);
    const rows = await examCommentRepository.countApprovedByQuestion(examId);
    return { counts: Object.fromEntries(rows.map((r) => [String(r.questionNumber), r._count._all])) };
  },

  /** Lọc rồi lưu: từ cấm -> 422 không lưu; nghi ngờ -> PENDING kèm flagReason; còn lại hiện ngay. Mở đầu bằng chữ đáp án thì tự bình chọn. */
  async create(actor: Actor, author: { id: string; createdAt: Date }, examId: string, { questionNumber, body }: CreateCommentBody) {
    await examService.assertAccess(actor, examId);
    await assertQuestion(examId, questionNumber);
    const text = moderateComment(body);
    if (text === "BLOCKED") throw new AppError(COMMENT_BLOCKED_MESSAGE, HTTP_STATUS.UNPROCESSABLE_ENTITY, { body: COMMENT_BLOCKED_MESSAGE }, "COMMENT_BLOCKED");

    const userId = author.id;
    const now = Date.now();
    const since = new Date(now - EXAM_COMMENT_DUPLICATE_WINDOW_MS);
    const [today, onQuestion, sameElsewhere, strikes] = await Promise.all([
      examCommentRepository.countByUserSince(userId, since),
      examCommentRepository.onQuestionSince(userId, examId, questionNumber, since, EXAM_COMMENT_PER_QUESTION_PER_DAY),
      body.length >= EXAM_COMMENT_SPAM_MIN_LENGTH ? examCommentRepository.countSameBodyElsewhere(userId, examId, questionNumber, body, since) : 0,
      examCommentRepository.countRejectedSince(userId, new Date(now - EXAM_COMMENT_STRIKE_WINDOW_MS)),
    ]);
    const newAccount = now - author.createdAt.getTime() < EXAM_COMMENT_NEW_ACCOUNT_MS;
    const limit = commentLimitError({ today, onQuestion: onQuestion.map((c) => c.body), newAccount }, body);
    if (limit === "daily") throw new AppError("Hôm nay bạn đã bình luận quá nhiều, vui lòng quay lại sau", HTTP_STATUS.TOO_MANY_REQUESTS);
    if (limit === "question") throw new AppError("Hôm nay bạn đã bình luận câu này nhiều rồi, vui lòng quay lại sau", HTTP_STATUS.TOO_MANY_REQUESTS);
    if (limit === "duplicate") throw AppError.conflict("Bạn đã gửi bình luận này cho câu này rồi", { body: "Bạn đã gửi bình luận này cho câu này rồi" });

    const flagReason = holdReason(text, { sameElsewhere, strikes });
    const row = await examCommentRepository.create({ examId, questionNumber, userId, body, status: flagReason ? "PENDING" : "APPROVED", flagReason });
    const letters = questionNumber > 0 ? answerLettersOf(body) : null; // tệp đính kèm không có bình chọn
    // Bình luận bị giữ chưa có hiệu lực công khai nên không đổi phiếu
    if (letters && !flagReason) await examReactionRepository.setVote({ examId, questionNumber }, userId, letters.join(" "));
    if (flagReason) notifyAdmins("held", userId, examId, questionNumber, body);
    return toPublicComment(row, userId);
  },

  // Người viết xoá bình luận của mình (mọi trạng thái); không phải của mình thì 404 như không tồn tại
  async removeOwn(userId: string, examId: string, commentId: string) {
    if ((await examCommentRepository.deleteOwn(commentId, examId, userId)) === 0) throw AppError.notFound(COMMENT_NOT_FOUND);
    return { id: commentId, deleted: true };
  },

  // Thích / bỏ thích một bình luận đang hiện của đề (gọi lại cùng giá trị không đổi kết quả)
  async like(actor: Actor, userId: string, examId: string, commentId: string, liked: boolean) {
    const comment = await approvedComment(actor, examId, commentId);
    return { likes: await examCommentRepository.setLike(comment.id, userId, liked), liked };
  },

  /** Báo cáo (mỗi người một lần, báo lại vẫn thành công). Đủ số người báo cáo thì tự ẩn, trừ bình luận admin đã duyệt tay. */
  async report(actor: Actor, userId: string, examId: string, commentId: string, reason: string | null) {
    const comment = await approvedComment(actor, examId, commentId);
    if (comment.userId === userId) throw AppError.forbidden("Bạn không thể báo cáo bình luận của chính mình");
    if (await examCommentRepository.hasReport(comment.id, userId)) return { reported: true as const };
    if ((await examCommentRepository.countReportsByUserSince(userId, new Date(Date.now() - EXAM_COMMENT_DUPLICATE_WINDOW_MS))) >= EXAM_COMMENT_REPORTS_PER_DAY) {
      throw new AppError("Hôm nay bạn đã báo cáo nhiều bình luận, vui lòng quay lại sau", HTTP_STATUS.TOO_MANY_REQUESTS);
    }
    if ((await examCommentRepository.addReport(comment.id, userId, reason)) && (await examCommentRepository.countReports(comment.id)) >= EXAM_COMMENT_AUTO_HIDE_REPORTS) {
      // Đã duyệt tay thì không ẩn, chỉ nằm trong hàng đợi "Bị báo cáo"
      if (!comment.reviewedById) await examCommentRepository.hideReported(comment.id);
      notifyAdmins("reported", comment.userId, examId, comment.questionNumber, comment.body);
    }
    return { reported: true as const };
  },

  // ----- Admin
  async adminList({ status, q, ...page }: ListAdminCommentsQuery) {
    const { items, total } = await examCommentRepository.listAdmin(page, status === "all" ? undefined : status, q || undefined);
    return { items: await withImages(items), meta: toMeta(page, total) };
  },

  async adminSummary() {
    const [pending, reported] = await Promise.all([examCommentRepository.countPending(), examCommentRepository.countReported()]);
    return { pending, reported };
  },

  /** Duyệt hoặc từ chối (gọi lại với cùng trạng thái không đổi kết quả), xử lý xong các báo cáo. Trả về đúng dạng một dòng của danh sách admin. */
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
