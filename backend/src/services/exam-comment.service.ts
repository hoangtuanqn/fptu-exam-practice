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
  EXAM_COMMENT_UPLOADS_PER_DAY,
  type CommentFlagReason,
} from "../constants/exam-comment";
import { HTTP_STATUS } from "../constants/httpStatus";
import { answerReportRepository } from "../repositories/answer-report.repository";
import { examCommentRepository, type AdminCommentRow, type CommentReaction, type PublicCommentRow } from "../repositories/exam-comment.repository";
import { examReactionRepository } from "../repositories/exam-reaction.repository";
import { examAttachmentRepository } from "../repositories/exam-attachment.repository";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import type {
  BulkReviewCommentsBody,
  CreateCommentBody,
  ListAdminCommentsQuery,
  ListCommentsQuery,
  ListRepliesQuery,
  MentionsQuery,
  ReviewCommentBody,
} from "../rules/requests/exam-comment.request";
import type { Actor } from "../utils/actor";
import { answerLettersOf, moderateComment } from "../utils/comment-text";
import { isImageAttachment } from "../utils/attachment";
import { fileUrlOf, toAttachmentDto } from "../utils/file-url";
import { toMeta, toSkipTake } from "../utils/pagination";
import { isProUntil } from "../utils/pro";
import { adminNoticeService } from "./admin-notice.service";
import { examCommentFileService, type CommentUpload } from "./exam-comment-file.service";
import { commentNoticeService } from "./exam-comment-notice.service";
import { examService } from "./exam.service";

const COMMENT_NOT_FOUND = "Không tìm thấy bình luận này, có thể nó đã bị xoá.";
export const COMMENT_BLOCKED_MESSAGE = "Bình luận có từ ngữ không phù hợp, bạn sửa lại nhé";
const TOO_MANY_UPLOADS = "Hôm nay bạn đã tải lên nhiều tệp, vui lòng quay lại sau";
const sameText = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");

/**
 * Mục được bình luận/thích không có trong đề: cùng một lỗi 422 cho bình luận, bình chọn, thích.
 * Số dương = câu hỏi (ExamQuestion.number), số âm = -id của tệp đính kèm là ảnh của đề này (tệp khác không bình luận được), 0 = cả đề (chỉ khi `exam`: bình luận chung) (decision 0019).
 */
export async function assertQuestion(examId: string, questionNumber: number, exam = false) {
  const file = questionNumber < 0 ? await examAttachmentRepository.find(examId, -questionNumber) : null;
  const found =
    questionNumber > 0
      ? await examRepository.findQuestionAnswer(examId, questionNumber)
      : questionNumber < 0
        ? file && isImageAttachment(file)
        : exam && (await examRepository.findByThreadIdOfId(examId)); // admin qua được assertAccess cả với đề không tồn tại nên vẫn kiểm tra
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

// commentCount = số bình luận đã duyệt của người viết trên cả trang web; index = số thứ tự "#n" của bình luận gốc đã duyệt (null nếu không có)
type Extra = { likes: number; dislikes: number; reaction: CommentReaction | null; replyCount: number; commentCount?: number; index?: number | null };
const NO_EXTRA: Extra = { likes: 0, dislikes: 0, reaction: null, replyCount: 0 };

/**
 * Một dòng bình luận cho người xem: không có id/email người viết, không có lý do bị giữ; `mine` = của người xem.
 * replyTo = tên người được trả lời (null khi trả lời thẳng bình luận gốc hoặc bình luận đó đã bị xoá); replyCount chỉ có ở bình luận gốc.
 * author.joinedAt = ngày tạo tài khoản (thẻ tác giả kiểu diễn đàn). attachments = tệp đính kèm (link ký ngắn hạn), mentions = tên người được nhắc.
 */
export const toPublicComment = (row: PublicCommentRow, viewerId: string | null, x: Extra = NO_EXTRA) => ({
  id: row.id,
  questionNumber: row.questionNumber,
  body: row.body,
  status: row.status,
  createdAt: row.createdAt,
  parentId: row.parentId,
  replyTo: row.replyTo && row.replyToId !== row.parentId ? { name: row.replyTo.user.fullName } : null,
  author: {
    name: row.user.fullName,
    avatarUrl: avatarUrlOf(row.userId, row.user.avatarPath),
    isPro: isProUntil(row.user.proExpiresAt),
    isAdmin: row.user.role === "ADMIN",
    joinedAt: row.user.createdAt,
    commentCount: x.commentCount ?? 0,
  },
  index: x.index ?? null,
  mine: viewerId !== null && row.userId === viewerId,
  likes: x.likes,
  liked: x.reaction === "like",
  dislikes: x.dislikes,
  reaction: x.reaction,
  replyCount: row.parentId ? 0 : x.replyCount,
  attachments: row.files.map((f) => examCommentFileService.toDto(row.examId, f)),
  mentions: row.mentions.map((m) => m.user.fullName),
});

// Số thích/không thích, cảm xúc của người xem, số trả lời và số bình luận của người viết cho cả trang: bốn truy vấn gộp, không truy vấn theo từng dòng
async function decorate(rows: PublicCommentRow[], viewerId: string | null, indexOf = new Map<string, number>()) {
  const ids = rows.map((r) => r.id);
  const [counts, mine, replies, authors] = await Promise.all([
    examCommentRepository.reactionCounts(ids),
    viewerId ? examCommentRepository.viewerReactions(viewerId, ids) : new Map<string, CommentReaction>(),
    examCommentRepository.replyCounts(rows.filter((r) => !r.parentId).map((r) => r.id)),
    examCommentRepository.approvedCountsByUser(rows.map((r) => r.userId)),
  ]);
  return rows.map((r) =>
    toPublicComment(r, viewerId, {
      ...counts.get(r.id)!,
      reaction: mine.get(r.id) ?? null,
      replyCount: replies.get(r.id) ?? 0,
      commentCount: authors.get(r.userId) ?? 0,
      index: indexOf.get(r.id) ?? null,
    }),
  );
}

/**
 * Số thứ tự "#n" (1 = cũ nhất) của các bình luận gốc đã duyệt trong một trang, suy từ vị trí trong trang và total: không cần truy vấn thêm.
 * `skip` = số dòng trước trang này theo đúng thứ tự `order` của danh sách.
 */
export function rootIndexes(ids: readonly string[], skip: number, total: number, order: "newest" | "oldest") {
  return new Map(ids.map((id, i) => [id, order === "oldest" ? skip + i + 1 : total - skip - i]));
}

// Loại mục được bình luận (decision 0019): 0 = cả đề, dương = câu hỏi, âm = tệp đính kèm
export const targetKindOf = (questionNumber: number) => (questionNumber === 0 ? "exam" : questionNumber > 0 ? "question" : "file");

const byTime = (a: PublicCommentRow, b: PublicCommentRow) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);

// shortcut: chống báo trùng giữ trong bộ nhớ (mất khi khởi động lại, chỉ là báo thêm một lần); một tiến trình PM2 nên đủ
const lastNotice = new Map<string, number>();
function notifyAdmins(kind: "held" | "reported", userId: string, examId: string, questionNumber: number, body: string) {
  const key = `${kind}:${examId}`; // mỗi loại thông báo có bộ đếm riêng
  const last = lastNotice.get(key);
  if (last && Date.now() - last < EXAM_COMMENT_NOTICE_THROTTLE_MS) return;
  if (lastNotice.size > 500) lastNotice.clear();
  lastNotice.set(key, Date.now());
  adminNoticeService.push("comment.created", {
    title: `${kind === "held" ? "Bình luận chờ duyệt" : "Bình luận bị báo cáo"}: {exam}, ${{ exam: "thảo luận chung", question: `câu ${questionNumber}`, file: "tệp đính kèm" }[targetKindOf(questionNumber)]}`,
    examId,
    body: body.slice(0, 200),
    userId,
    link: kind === "held" ? "/admin/exam-comments" : "/admin/exam-comments?status=REPORTED",
  });
}

// Dòng của admin: gắn ảnh câu hỏi / tệp đính kèm (một truy vấn mỗi loại cho cả trang), user -> author, số báo cáo đang mở;
// examId đã có trong exam.id nên bỏ. Tệp đính kèm: targetName = tên tệp, imageUrl chỉ khi tệp là ảnh. Thảo luận chung (0): cả hai null.
async function withImages(rows: AdminCommentRow[]) {
  const [images, files] = await Promise.all([
    answerReportRepository.questionImages(rows.filter((c) => c.questionNumber > 0).map((c) => ({ examId: c.examId, number: c.questionNumber }))),
    examAttachmentRepository.byIds([...new Set(rows.filter((c) => c.questionNumber < 0).map((c) => -c.questionNumber))]),
  ]);
  const imageOf = new Map(images.map((i) => [`${i.examId}:${i.number}`, fileUrlOf(i.imagePath)]));
  const fileOf = new Map(files.map((f) => [`${f.examId}:${-f.id}`, f]));
  return rows.map(({ examId, user, _count, files: attached, ...c }) => {
    const file = fileOf.get(`${examId}:${c.questionNumber}`);
    return {
      ...c,
      attachments: attached.map((f) => examCommentFileService.toDto(examId, f)),
      reportCount: _count.reports,
      author: user,
      imageUrl: file ? (isImageAttachment(file) ? toAttachmentDto(examId, file).url : null) : (imageOf.get(`${examId}:${c.questionNumber}`) ?? null),
      targetName: file?.name ?? null,
      targetKind: targetKindOf(c.questionNumber),
    };
  });
}

/**
 * Báo cho người được nhắc trong các bình luận vừa hiện công khai (mỗi người một lần cho mỗi bình luận, đánh dấu trong DB nên ẩn rồi duyệt lại không báo nữa).
 * Người nhận thông báo trả lời (người được trả lời, người viết bình luận gốc) thì không nhận thêm. Chỉ là phụ: lỗi chỉ ghi log. Trả promise để test chờ được.
 */
function notifyMentions(commentIds: string[]) {
  return examCommentRepository
    .claimMentions(commentIds)
    .then((rows) => {
      const byComment = new Map<string, typeof rows>();
      for (const r of rows) byComment.set(r.comment.id, [...(byComment.get(r.comment.id) ?? []), r]);
      for (const list of byComment.values()) {
        const c = list[0]!.comment;
        const t = { examId: c.examId, questionNumber: c.questionNumber, commentId: c.id, body: c.body };
        commentNoticeService.mention(t, { id: c.userId, name: c.user.fullName }, list.map((r) => r.userId), c.parent ? [c.replyTo?.userId, c.parent.userId] : []);
      }
    })
    .catch((err: unknown) => console.error("[comment-notice] mention", (err as Error).message));
}

// Duyệt/từ chối; trả lời vừa chuyển sang đã duyệt thì báo cho người được trả lời như lúc gửi, người được nhắc chưa được báo thì báo
async function reviewAndNotify(ids: string[], data: Parameters<typeof examCommentRepository.review>[1]) {
  const held = data.status === "APPROVED" ? await examCommentRepository.repliesNotApproved(ids) : [];
  const updated = await examCommentRepository.review(ids, data);
  for (const r of held) {
    commentNoticeService.reply({ examId: r.examId, questionNumber: r.questionNumber, commentId: r.id, body: r.body }, { id: r.userId, name: r.user.fullName }, [r.replyTo?.userId, r.parent?.userId]);
  }
  if (data.status === "APPROVED") await notifyMentions(ids);
  // Từ chối thì bỏ luôn tệp đính kèm (như ảnh đề đóng góp bị từ chối), để ổ đĩa không đầy vì tệp không bao giờ được hiện
  else await examCommentFileService.removeFiles(await examCommentRepository.deleteFilesOf(ids));
  return updated;
}

// Người được nhắc: ref -> người viết của bình luận đó trong đề này; chỉ giữ người có "@<tên>" trong nội dung, bỏ chính mình và ref sai
async function resolveMentions(examId: string, authorId: string, body: string, refs: readonly string[] = []) {
  const authors = await examCommentRepository.mentionAuthors([...new Set(refs)], examId);
  return [...new Set(authors.filter((a) => a.userId !== authorId && body.includes(`@${a.user.fullName}`)).map((a) => a.userId))];
}

// Xoá bình luận (và các trả lời): đọc đường dẫn tệp trước, xoá dòng, rồi xoá tệp trên đĩa
// shortcut: một trả lời có tệp được tạo đúng lúc giữa hai bước thì tệp của nó còn trên đĩa (dòng đã xoá); xoá đề vẫn dọn cả thư mục
async function deleteWithFiles(id: string, remove: () => Promise<number>) {
  const files = await examCommentRepository.threadFilePaths(id);
  const count = await remove();
  if (count > 0) await examCommentFileService.removeFiles(files);
  return count;
}

async function approvedComment(actor: Actor, examId: string, commentId: string) {
  await examService.assertAccess(actor, examId);
  const comment = await examCommentRepository.findApproved(commentId, examId);
  if (!comment) throw AppError.notFound(COMMENT_NOT_FOUND);
  if (comment.questionNumber < 0) await assertQuestion(examId, comment.questionNumber); // bình luận cũ trên tệp không phải ảnh: không thích/báo cáo được nữa
  return comment;
}

export const examCommentService = {
  // ----- Người xem (khách hoặc thành viên); đề phải nằm trong kho của người xem như mọi API đề khác
  // Chỉ bình luận gốc, mới nhất trước (hoặc cũ nhất trước với order=oldest); trả lời lấy riêng theo từng bình luận gốc
  async list(actor: Actor, viewerId: string | null, examId: string, { question, order = "newest", ...page }: Omit<ListCommentsQuery, "order"> & Partial<Pick<ListCommentsQuery, "order">>) {
    await examService.assertAccess(actor, examId);
    if (question < 0) await assertQuestion(examId, question); // tệp không phải ảnh: 422 như mục không tồn tại
    const [{ items, total }, own] = await Promise.all([
      examCommentRepository.listApproved(examId, question, page, order),
      // Bình luận chưa duyệt của chính mình chỉ hiện ở đầu trang 1 (không tính vào total)
      viewerId && page.page === 1 ? examCommentRepository.listOwnUnapproved(examId, question, viewerId, EXAM_COMMENT_OWN_PENDING_MAX) : [],
    ]);
    const indexOf = rootIndexes(items.map((r) => r.id), toSkipTake(page).skip, total, order);
    return { items: await decorate([...own, ...items], viewerId, indexOf), meta: toMeta(page, total) };
  },

  // Trả lời của một bình luận gốc đang hiện, cũ nhất trước; trả lời chưa duyệt của chính mình xen vào trang 1 theo thời gian
  async replies(actor: Actor, viewerId: string | null, examId: string, rootId: string, page: ListRepliesQuery) {
    await examService.assertAccess(actor, examId);
    const root = await examCommentRepository.findApprovedRoot(rootId, examId);
    if (!root) throw AppError.notFound(COMMENT_NOT_FOUND);
    if (root.questionNumber < 0) await assertQuestion(examId, root.questionNumber);
    const [{ items, total }, own] = await Promise.all([
      examCommentRepository.listReplies(rootId, page),
      viewerId && page.page === 1 ? examCommentRepository.listOwnUnapprovedReplies(rootId, viewerId, EXAM_COMMENT_OWN_PENDING_MAX) : [],
    ]);
    return { items: await decorate([...own, ...items].sort(byTime), viewerId), meta: toMeta(page, total) };
  },

  /** Gợi ý nhắc tên: người đã có bình luận được duyệt trong đề (trừ người xem và tài khoản đã xoá). ref = id một bình luận của họ, không lộ id người dùng. */
  async mentionCandidates(actor: Actor, viewerId: string, examId: string, { q, limit }: MentionsQuery) {
    await examService.assertAccess(actor, examId);
    const rows = await examCommentRepository.mentionSuggestions(examId, viewerId, q, limit);
    return rows.map((r) => ({ ref: r.ref, name: r.fullName, avatarUrl: avatarUrlOf(r.userId, r.avatarPath) }));
  },

  async counts(actor: Actor, examId: string) {
    await examService.assertAccess(actor, examId);
    const all = await examCommentRepository.countApprovedByQuestion(examId);
    // Tệp đính kèm không phải ảnh không bình luận được: bỏ khỏi số đếm (dòng cũ vẫn còn trong DB cho admin xoá)
    const images = all.some((r) => r.questionNumber < 0) ? new Set((await examAttachmentRepository.list(examId)).filter(isImageAttachment).map((a) => -a.id)) : null;
    const rows = all.filter((r) => r.questionNumber >= 0 || images?.has(r.questionNumber));
    return { counts: Object.fromEntries(rows.map((r) => [String(r.questionNumber), r._count._all])) };
  },

  /**
   * Lọc rồi lưu: từ cấm -> 422 không lưu; nghi ngờ -> PENDING kèm flagReason; còn lại hiện ngay. Mở đầu bằng chữ đáp án thì tự bình chọn.
   * Trả lời (replyToId) đi qua đúng các luật trên; trả lời một trả lời thì gắn vào cùng bình luận gốc (từ cấp 2 trở đi là phẳng).
   */
  async create(actor: Actor, author: { id: string; createdAt: Date; fullName: string }, examId: string, { questionNumber, body, replyToId, mentions }: CreateCommentBody, uploads: readonly CommentUpload[] = []) {
    await examService.assertAccess(actor, examId);
    await assertQuestion(examId, questionNumber, true);
    const target = replyToId ? await examCommentRepository.findApproved(replyToId, examId) : null;
    if (replyToId && (!target || (target.parent && target.parent.status !== "APPROVED"))) throw AppError.notFound(COMMENT_NOT_FOUND);
    if (target && target.questionNumber !== questionNumber) {
      throw new AppError("Bình luận bạn trả lời thuộc câu khác", HTTP_STATUS.UNPROCESSABLE_ENTITY, { replyToId: "Bình luận bạn trả lời thuộc câu khác" });
    }
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
    if (limit === "question") throw new AppError("Hôm nay bạn đã bình luận ở đây nhiều rồi, vui lòng quay lại sau", HTTP_STATUS.TOO_MANY_REQUESTS);
    if (limit === "duplicate") throw AppError.conflict("Bạn đã gửi bình luận này ở đây rồi", { body: "Bạn đã gửi bình luận này ở đây rồi" });
    if (uploads.length && (await examCommentRepository.countFilesByUserSince(userId, since)) + uploads.length > EXAM_COMMENT_UPLOADS_PER_DAY) {
      throw new AppError(TOO_MANY_UPLOADS, HTTP_STATUS.TOO_MANY_REQUESTS, { files: TOO_MANY_UPLOADS });
    }
    const mentionUserIds = await resolveMentions(examId, userId, body, mentions);

    // Có tệp thì luôn chờ duyệt (UPLOAD), trừ khi đã bị giữ vì lý do khác (giữ lý do đó)
    const flagReason = holdReason(text, { sameElsewhere, strikes }) ?? (uploads.length ? "UPLOAD" : null);
    // Tệp ghi ra đĩa trước, rồi mới ghi DB (một câu lệnh); DB lỗi thì xoá tệp vừa ghi
    const files = await examCommentFileService.store(examId, uploads);
    let row: Awaited<ReturnType<typeof examCommentRepository.create>>;
    try {
      row = await examCommentRepository.create({
        examId,
        questionNumber,
        userId,
        body,
        status: flagReason ? "PENDING" : "APPROVED",
        flagReason,
        parentId: target ? (target.parentId ?? target.id) : null,
        replyToId: target?.id ?? null,
        files,
        mentionUserIds,
      });
    } catch (err) {
      await examCommentFileService.removeFiles(files.map((f) => f.filePath));
      throw err;
    }
    // Trả lời / nhắc tên bị giữ thì báo khi admin duyệt (review)
    if (target && !flagReason) commentNoticeService.reply({ examId, questionNumber, commentId: row.id, body }, { id: userId, name: author.fullName }, [target.userId, target.parent?.userId]);
    if (mentionUserIds.length && !flagReason) await notifyMentions([row.id]);
    const letters = questionNumber > 0 ? answerLettersOf(body) : null; // tệp đính kèm và thảo luận chung (0) không có bình chọn
    // Bình luận bị giữ chưa có hiệu lực công khai nên không đổi phiếu
    if (letters && !flagReason) {
      await examCommentRepository.deleteAutoVote(examId, questionNumber, userId); // phiếu đổi: bình luận tự tạo từ lần bấm trước không còn đúng
      await examReactionRepository.setVote({ examId, questionNumber }, userId, letters.join(" "));
    }
    if (flagReason) notifyAdmins("held", userId, examId, questionNumber, body);
    const [commentCount, roots] = await Promise.all([
      examCommentRepository.approvedCountsByUser([userId]).then((m) => m.get(userId) ?? 0),
      // bình luận gốc vừa hiện là bình luận mới nhất: số thứ tự = số bình luận gốc đã duyệt
      row.status === "APPROVED" && !row.parentId ? examCommentRepository.countApprovedRoots(examId, questionNumber) : null,
    ]);
    return toPublicComment(row, userId, { ...NO_EXTRA, commentCount, index: roots });
  },

  // Người viết xoá bình luận của mình (mọi trạng thái); không phải của mình thì 404 như không tồn tại
  async removeOwn(userId: string, examId: string, commentId: string) {
    if ((await deleteWithFiles(commentId, () => examCommentRepository.deleteOwn(commentId, examId, userId))) === 0) throw AppError.notFound(COMMENT_NOT_FOUND);
    return { id: commentId, deleted: true };
  },

  /** Thích / không thích / bỏ (null) trên một bình luận đang hiện của đề; gọi lại cùng giá trị không đổi kết quả. */
  async react(actor: Actor, user: { id: string; fullName: string }, examId: string, commentId: string, reaction: CommentReaction | null, onlyIf?: CommentReaction) {
    const comment = await approvedComment(actor, examId, commentId);
    const previous = await examCommentRepository.setReaction(comment.id, user.id, reaction, onlyIf);
    // Chỉ báo khi vừa thêm hoặc đổi cảm xúc (bỏ thì không)
    if (reaction && reaction !== previous) {
      commentNoticeService.reaction({ examId, questionNumber: comment.questionNumber, commentId: comment.id, authorId: comment.userId, body: comment.body }, { id: user.id, name: user.fullName }, reaction);
    }
    const { likes, dislikes } = (await examCommentRepository.reactionCounts([comment.id])).get(comment.id)!;
    const now = reaction ?? (previous && onlyIf && previous !== onlyIf ? previous : null);
    return { likes, dislikes, reaction: now };
  },

  // API thích cũ: chỉ bật/tắt thích (tắt không đụng tới "không thích")
  async like(actor: Actor, user: { id: string; fullName: string }, examId: string, commentId: string, liked: boolean) {
    const { likes, reaction } = await this.react(actor, user, examId, commentId, liked ? "like" : null, "like");
    return { likes, liked: reaction === "like" };
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
    if ((await reviewAndNotify([id], { status, reviewedById: adminId, reviewNote: note || null })) === 0) throw AppError.notFound(COMMENT_NOT_FOUND);
    const row = await examCommentRepository.findAdmin(id);
    if (!row) throw AppError.notFound(COMMENT_NOT_FOUND);
    return (await withImages([row]))[0]!;
  },

  async bulkReview(adminId: string, { ids, status }: BulkReviewCommentsBody) {
    return { updated: await reviewAndNotify([...new Set(ids)], { status, reviewedById: adminId, reviewNote: null }) };
  },

  async adminRemove(id: string) {
    if ((await deleteWithFiles(id, () => examCommentRepository.deleteById(id))) === 0) throw AppError.notFound(COMMENT_NOT_FOUND);
    return { id, deleted: true };
  },
};
