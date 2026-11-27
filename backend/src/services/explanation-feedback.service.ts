import { prisma } from "../configs/prisma";
import { PRO_BENEFITS } from "../constants/plan";
import { ANSWER_REPORT_REWARD, EXPLAIN_FEEDBACK_REWARD } from "../constants/report";
import { realtimeHub } from "../realtime/hub";
import { answerReportRepository } from "../repositories/answer-report.repository";
import { examRepository } from "../repositories/exam.repository";
import { explanationFeedbackRepository } from "../repositories/explanation-feedback.repository";
import { explanationRepository } from "../repositories/explanation.repository";
import { AppError } from "../rules/error";
import type { ConfirmFeedbackBody, ExplainFeedbackBody, ListFeedbackQuery } from "../rules/requests/explanation.request";
import type { Actor } from "../utils/actor";
import { normalizeAnswer } from "../utils/exam-answers";
import { fileUrlOf } from "../utils/file-url";
import { toMeta } from "../utils/pagination";
import { examService } from "./exam.service";
import { planService } from "./plan.service";
import { walletService } from "./wallet.service";

const HANDLED = "Góp ý này đã được xử lý";

type AdminRow = NonNullable<Awaited<ReturnType<typeof explanationFeedbackRepository.findAdmin>>>;

// Gắn nội dung lời giải đang lưu và ảnh câu hỏi cho các dòng của admin (mỗi thứ một truy vấn cho cả trang), để admin đối chiếu với đề
async function withExplanations(items: AdminRow[]) {
  const [explained, images] = await Promise.all([
    explanationFeedbackRepository.explanationsOf(items.map((r) => ({ examId: r.examId, questionNumber: r.questionNumber }))),
    answerReportRepository.questionImages(items.map((r) => ({ examId: r.examId, number: r.questionNumber }))),
  ]);
  const contentOf = new Map(explained.map((e) => [`${e.examId}:${e.questionNumber}`, e]));
  const questionOf = new Map(images.map((q) => [`${q.examId}:${q.number}`, q]));
  return items.map((r) => {
    const e = contentOf.get(`${r.examId}:${r.questionNumber}`);
    const q = questionOf.get(`${r.examId}:${r.questionNumber}`);
    return {
      ...r,
      imageUrl: q ? fileUrlOf(q.imagePath) : null,
      updatedAt: r.updatedAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      explanation: e?.content ?? null,
      model: e?.model ?? null,
      currentAnswer: q ? normalizeAnswer(q.answer) : null,
      // Lời giải đang lưu tạo sau lần góp ý cuối: không phải bản bị chê, chỉ đóng được
      explanationStale: !r.resolvedAt && !!e && e.createdAt > r.updatedAt,
    };
  });
}

// 👍/👎 cho lời giải AI của một câu: chỉ người đã được xem lời giải đó mới đánh giá được (không ai đánh giá thứ mình chưa đọc)
export const explanationFeedbackService = {
  async submit(actor: Actor, userId: string, { examId, questionNumber, helpful, reason, comment }: ExplainFeedbackBody) {
    await examService.assertAccess(actor, examId);
    const entitled =
      (PRO_BENEFITS.freeExplain && (await planService.isPro(userId))) || (await explanationRepository.hasUnlocked(userId, examId)) || (await explanationRepository.hasPurchased(userId, examId, questionNumber));
    if (!entitled) throw AppError.forbidden("Bạn cần xem lời giải của câu này trước khi đánh giá");
    const explanation = await explanationRepository.find(examId, questionNumber);
    if (!explanation) throw new AppError("Câu này chưa có lời giải để đánh giá");
    const data = { helpful, reason: helpful ? null : (reason ?? null), comment: helpful ? null : comment || null };
    const prev = await explanationFeedbackRepository.find(userId, examId, questionNumber);
    // Lời chê mới, đổi lý do/góp ý, hoặc chê bản lời giải tạo sau khi góp ý cũ đã xử lý: mở lại để admin xem
    // (thưởng cũ về 0, lịch sử nằm ở sổ ví); gửi lại y hệt cho cùng bản lời giải thì giữ trạng thái đã giải quyết
    const regenerated = !!prev?.resolvedAt && explanation.createdAt > prev.resolvedAt;
    const reopen = !helpful && (prev?.helpful !== false || prev.reason !== data.reason || prev.comment !== data.comment || regenerated);
    await explanationFeedbackRepository.upsert(userId, examId, questionNumber, reopen ? { ...data, resolvedAt: null, resolvedById: null, reward: 0 } : data);
    return { helpful };
  },

  /** Đánh giá hiện tại của người dùng cho một câu (null = chưa đánh giá, hoặc lời giải đã được tạo lại sau lần đánh giá đó). */
  async mine(userId: string, examId: string, questionNumber: number) {
    const [feedback, explanation] = await Promise.all([explanationFeedbackRepository.find(userId, examId, questionNumber), explanationRepository.find(examId, questionNumber)]);
    if (!feedback || (explanation && explanation.createdAt > feedback.updatedAt)) return null;
    return feedback.helpful;
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

  /**
   * Admin xác nhận một 👎 là đúng, trong một transaction: xóa bản lời giải bị chê, chốt góp ý kèm thưởng, đóng các 👎 khác của câu,
   * sửa đáp án nếu có, cộng credit. Mỗi bản lời giải thưởng đúng một lần (cổng xóa lời giải chạy trước mọi lệnh ghi khác).
   */
  async confirm(adminId: string, id: string, { answer }: ConfirmFeedbackBody) {
    const result = await prisma.$transaction(async (tx) => {
      const feedback = await explanationFeedbackRepository.findForConfirm(tx, id);
      if (!feedback) throw AppError.notFound("Không tìm thấy đánh giá");
      const { userId, examId, questionNumber } = feedback;
      let corrected: string | null = null;
      if (answer !== undefined) {
        const current = await examRepository.findQuestionAnswer(examId, questionNumber);
        if (!current) throw AppError.notFound("Không tìm thấy câu hỏi");
        corrected = normalizeAnswer(answer);
        if (corrected === normalizeAnswer(current.answer)) throw new AppError("Đáp án mới trùng đáp án hiện tại", undefined, { answer: "Trùng với đáp án hiện tại" });
      }
      // Người này có báo cáo đáp án đang chờ cho câu này: xử lý ở trang Báo cáo đáp án để không thưởng hai lần
      if (await answerReportRepository.hasPending(tx, userId, examId, questionNumber)) {
        throw AppError.conflict("Người này đang có báo cáo đáp án cho câu này, hãy xử lý ở trang Báo cáo đáp án");
      }
      if (feedback.helpful || feedback.resolvedAt) throw AppError.conflict(HANDLED);
      if (!(await explanationFeedbackRepository.claimExplanation(tx, examId, questionNumber, feedback.updatedAt))) {
        throw AppError.conflict("Lời giải đã được tạo lại hoặc đã xóa, bạn chỉ có thể đóng góp ý");
      }
      const reward = corrected ? ANSWER_REPORT_REWARD : EXPLAIN_FEEDBACK_REWARD;
      if (!(await explanationFeedbackRepository.settle(tx, id, adminId, reward))) throw AppError.conflict(HANDLED);
      await explanationFeedbackRepository.closeOthers(tx, examId, questionNumber, adminId);
      if (corrected) await examRepository.setQuestionAnswer(tx, examId, questionNumber, corrected);
      await walletService.applyChange(tx, { userId, amount: reward, type: "REPORT_REWARD", note: `Góp ý lời giải đúng: ${feedback.exam.title}, câu ${questionNumber}` });
      return { examId, corrected };
    });

    if (result.corrected) void realtimeHub.publishExam(result.examId); // người đang mở đề thấy đáp án mới
    const row = await explanationFeedbackRepository.findAdmin(id);
    if (!row) throw AppError.notFound("Không tìm thấy đánh giá");
    return (await withExplanations([row]))[0]!;
  },

  countPending: () => explanationFeedbackRepository.countPending(),

  adminSummary: () => explanationFeedbackRepository.summary(),
};
