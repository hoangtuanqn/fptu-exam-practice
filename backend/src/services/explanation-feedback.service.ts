import { PRO_BENEFITS } from "../constants/plan";
import { explanationFeedbackRepository } from "../repositories/explanation-feedback.repository";
import { explanationRepository } from "../repositories/explanation.repository";
import { AppError } from "../rules/error";
import type { ExplainFeedbackBody, ListFeedbackQuery } from "../rules/requests/explanation.request";
import type { Actor } from "../utils/actor";
import { toMeta } from "../utils/pagination";
import { examService } from "./exam.service";
import { planService } from "./plan.service";

// 👍/👎 cho lời giải AI của một câu: chỉ người đã được xem lời giải đó mới đánh giá được (không ai đánh giá thứ mình chưa đọc)
export const explanationFeedbackService = {
  async submit(actor: Actor, userId: number, { examId, questionNumber, helpful, reason, comment }: ExplainFeedbackBody) {
    await examService.assertAccess(actor, examId);
    const entitled =
      (PRO_BENEFITS.freeExplain && (await planService.isPro(userId))) || (await explanationRepository.hasUnlocked(userId, examId)) || (await explanationRepository.hasPurchased(userId, examId, questionNumber));
    if (!entitled) throw AppError.forbidden("Bạn cần xem lời giải của câu này trước khi đánh giá");
    if (!(await explanationRepository.find(examId, questionNumber))) throw new AppError("Câu này chưa có lời giải để đánh giá");
    await explanationFeedbackRepository.upsert(userId, examId, questionNumber, {
      helpful,
      reason: helpful ? null : (reason ?? null),
      comment: helpful ? null : comment || null,
    });
    return { helpful };
  },

  /** Đánh giá hiện tại của người dùng cho một câu (null = chưa đánh giá). */
  async mine(userId: number, examId: number, questionNumber: number) {
    return (await explanationFeedbackRepository.find(userId, examId, questionNumber))?.helpful ?? null;
  },

  async adminList(query: ListFeedbackQuery) {
    const { helpful, ...page } = query;
    const { items, total } = await explanationFeedbackRepository.listAdmin(page, helpful === undefined ? undefined : helpful === "up");
    const explained = await explanationFeedbackRepository.explanationsOf(items.map((r) => ({ examId: r.examId, questionNumber: r.questionNumber })));
    const contentOf = new Map(explained.map((e) => [`${e.examId}:${e.questionNumber}`, e]));
    return {
      items: items.map((r) => {
        const e = contentOf.get(`${r.examId}:${r.questionNumber}`);
        return { ...r, updatedAt: r.updatedAt.toISOString(), explanation: e?.content ?? null, model: e?.model ?? null };
      }),
      meta: toMeta(page, total),
    };
  },

  adminSummary: () => explanationFeedbackRepository.summary(),
};
