import { PRO_BENEFITS } from "../constants/plan";
import { answerReportRepository } from "../repositories/answer-report.repository";
import { explanationFeedbackRepository } from "../repositories/explanation-feedback.repository";
import { explanationRepository } from "../repositories/explanation.repository";
import { AppError } from "../rules/error";
import type { ExplainFeedbackBody, ListFeedbackQuery } from "../rules/requests/explanation.request";
import type { Actor } from "../utils/actor";
import { fileUrlOf } from "../utils/file-url";
import { toMeta } from "../utils/pagination";
import { examService } from "./exam.service";
import { planService } from "./plan.service";

type AdminRow = NonNullable<Awaited<ReturnType<typeof explanationFeedbackRepository.findAdmin>>>;

// Gắn nội dung lời giải đang lưu và ảnh câu hỏi cho các dòng của admin (mỗi thứ một truy vấn cho cả trang), để admin đối chiếu với đề
async function withExplanations(items: AdminRow[]) {
  const [explained, images] = await Promise.all([
    explanationFeedbackRepository.explanationsOf(items.map((r) => ({ examId: r.examId, questionNumber: r.questionNumber }))),
    answerReportRepository.questionImages(items.map((r) => ({ examId: r.examId, number: r.questionNumber }))),
  ]);
  const contentOf = new Map(explained.map((e) => [`${e.examId}:${e.questionNumber}`, e]));
  const imageOf = new Map(images.map((q) => [`${q.examId}:${q.number}`, fileUrlOf(q.imagePath)]));
  return items.map((r) => {
    const e = contentOf.get(`${r.examId}:${r.questionNumber}`);
    return { ...r, imageUrl: imageOf.get(`${r.examId}:${r.questionNumber}`) ?? null, updatedAt: r.updatedAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null, explanation: e?.content ?? null, model: e?.model ?? null };
  });
}

// 👍/👎 cho lời giải AI của một câu: chỉ người đã được xem lời giải đó mới đánh giá được (không ai đánh giá thứ mình chưa đọc)
export const explanationFeedbackService = {
  async submit(actor: Actor, userId: string, { examId, questionNumber, helpful, reason, comment }: ExplainFeedbackBody) {
    await examService.assertAccess(actor, examId);
    const entitled =
      (PRO_BENEFITS.freeExplain && (await planService.isPro(userId))) || (await explanationRepository.hasUnlocked(userId, examId)) || (await explanationRepository.hasPurchased(userId, examId, questionNumber));
    if (!entitled) throw AppError.forbidden("Bạn cần xem lời giải của câu này trước khi đánh giá");
    if (!(await explanationRepository.find(examId, questionNumber))) throw new AppError("Câu này chưa có lời giải để đánh giá");
    const data = { helpful, reason: helpful ? null : (reason ?? null), comment: helpful ? null : comment || null };
    const prev = await explanationFeedbackRepository.find(userId, examId, questionNumber);
    // Lời chê mới hoặc đổi lý do/góp ý: mở lại để admin xem; gửi lại y hệt thì giữ trạng thái đã giải quyết
    const reopen = !helpful && (prev?.helpful !== false || prev.reason !== data.reason || prev.comment !== data.comment);
    await explanationFeedbackRepository.upsert(userId, examId, questionNumber, reopen ? { ...data, resolvedAt: null, resolvedById: null } : data);
    return { helpful };
  },

  /** Đánh giá hiện tại của người dùng cho một câu (null = chưa đánh giá). */
  async mine(userId: string, examId: string, questionNumber: number) {
    return (await explanationFeedbackRepository.find(userId, examId, questionNumber))?.helpful ?? null;
  },

  async adminList(query: ListFeedbackQuery) {
    const { helpful, resolved, ...page } = query;
    const { items, total } = await explanationFeedbackRepository.listAdmin(page, helpful === undefined ? undefined : helpful === "up", resolved ? resolved === "true" : undefined);
    return { items: await withExplanations(items), meta: toMeta(page, total) };
  },

  /** Admin đánh dấu đã giải quyết (bỏ khỏi badge). Gọi lại không đổi gì; trả về đúng dạng một dòng của danh sách. */
  async adminResolve(adminId: string, id: string) {
    await explanationFeedbackRepository.resolve(id, adminId);
    const row = await explanationFeedbackRepository.findAdmin(id);
    if (!row) throw AppError.notFound("Không tìm thấy đánh giá");
    return (await withExplanations([row]))[0]!;
  },

  countPending: () => explanationFeedbackRepository.countPending(),

  adminSummary: () => explanationFeedbackRepository.summary(),
};
