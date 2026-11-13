import { PRO_BENEFITS } from "../constants/plan";
import { planService } from "./plan.service";
import fs from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { storageDir } from "../configs/env";
import { aiReady } from "../constants/ai";
import { activePromoEnd, promoExpired, type PromoConfig } from "../constants/promo";
import { EXAM_STORAGE_DIR } from "../constants/crawler";
import { explanationRepository } from "../repositories/explanation.repository";
import { examRepository } from "../repositories/exam.repository";
import { subjectRepository } from "../repositories/subject.repository";
import { userRepository } from "../repositories/user.repository";
import { subjectCodeFromTitle } from "../utils/subject-code";
import { AppError } from "../rules/error";
import type { Actor } from "../utils/actor";
import { explanationFeedbackService } from "./explanation-feedback.service";
import { explainQuestion } from "./ai/question-explainer.service";
import { aiSettingService } from "./ai-setting.service";
import { promoSettingService } from "./promo-setting.service";
import { commentsOfQuestion, compactCommentsText } from "./crawler/comments-file.service";
import { examService } from "./exam.service";
import { linkRewardService } from "./link-reward.service";
import { walletService } from "./wallet.service";

const BAD_GATEWAY = 502;

// Nhiều người cùng bấm một câu chưa có lời giải: chỉ gọi AI một lần, những người còn lại chờ cùng kết quả
const inflight = new Map<string, Promise<string>>();

type ExplainQuestion = NonNullable<Awaited<ReturnType<typeof examRepository.findQuestionForExplain>>>;

/** Mã và tên môn của đề (mã lưu ở đề, không có thì đọc từ tiêu đề), để AI không đoán sai môn/ngôn ngữ. */
export async function subjectOfExam(exam: ExplainQuestion["exam"]) {
  const subjectCode = exam.subjectCode ?? subjectCodeFromTitle(exam.title);
  const subjectName = subjectCode ? ((await subjectRepository.findByCode(subjectCode))?.name ?? null) : null;
  return { subjectCode, subjectName };
}

const isDuplicate = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

// Chỉ khoe số người đã mua khi đủ lớn, để không phản tác dụng
const SOCIAL_PROOF_MIN = 5;

export const explanationService = {
  // Báo giá gói "mở khóa cả đề": tính trên các câu CHƯA mua lẻ (ai đã mua lẻ vài câu không phải trả lại những câu đó)
  async bundleQuote(userId: number, examId: number, explainPrice: number, purchased: number[], promo: PromoConfig) {
    const [questions, unlocked, buyers] = await Promise.all([
      explanationRepository.countQuestions(examId),
      explanationRepository.hasUnlocked(userId, examId),
      explanationRepository.countUnlockBuyers(examId),
    ]);
    const remaining = Math.max(0, questions - purchased.length);
    const original = explainPrice * remaining; // giá nếu mua lẻ hết những câu còn lại
    const discountPercent = promoExpired(promo) ? 0 : promo.bundleDiscountPercent; // hết hạn chót thật thì về giá mua lẻ
    const price = Math.round((original * (100 - discountPercent)) / 100);
    const ends = activePromoEnd(promo);
    return {
      unlocked,
      questions,
      remaining,
      original,
      price,
      discountPercent,
      buyers: buyers >= SOCIAL_PROOF_MIN ? buyers : 0,
      promoEndsAt: ends ? ends.toISOString() : null,
    };
  },

  // Phí hiện tại, những câu đã mua lẻ trong một đề (để giao diện hiện "xem lại miễn phí") và báo giá gói mở khóa cả đề
  async info(actor: Actor, userId: number, examId: number) {
    await examService.assertAccess(actor, examId);
    const [ai, promo, purchased] = await Promise.all([aiSettingService.get(), promoSettingService.get(), explanationRepository.purchasedNumbers(userId, examId)]);
    const bundle = await this.bundleQuote(userId, examId, ai.explainPrice, purchased, promo);
    if (PRO_BENEFITS.freeExplain && (await planService.isPro(userId))) bundle.unlocked = true; // Pro: xem mọi câu miễn phí như đã mở khóa
    const trialsUsed = ai.explainPrice > 0 ? await explanationRepository.trialsUsed(userId) : 0;
    const freeTurns = await linkRewardService.status(userId);
    return { price: ai.explainPrice, purchased, unlocked: bundle.unlocked, bundle, freeTrialsLeft: ai.explainPrice > 0 ? Math.max(0, promo.freeTrials - trialsUsed) : 0, freeTurns };
  },

  /**
   * Mở khóa MỘT LẦN toàn bộ lời giải thích của đề: trả giá gói (rẻ hơn mua lẻ), sau đó xem mọi câu miễn phí.
   * Chỉ trừ tiền, không gọi AI hàng loạt: lời giải của từng câu vẫn được tạo khi người dùng mở câu đó (và dùng chung).
   */
  async unlock(actor: Actor, userId: number, examId: number, expectedPrice: number) {
    await examService.assertAccess(actor, examId);
    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { answerSource: true } });
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    if (exam.answerSource !== "AI" && exam.answerSource !== "MANUAL") throw new AppError("Đề chưa có đáp án chính thức nên chưa thể mở khóa giải thích");
    const [ai, promo] = await Promise.all([aiSettingService.get(), promoSettingService.get()]);
    const purchased = await explanationRepository.purchasedNumbers(userId, examId);
    if (PRO_BENEFITS.freeExplain && (await planService.isPro(userId))) throw new AppError("Gói Pro của bạn đã xem được mọi lời giải thích, không cần mở khóa");
    const quote = await this.bundleQuote(userId, examId, ai.explainPrice, purchased, promo);
    if (quote.unlocked) throw new AppError("Bạn đã mở khóa toàn bộ lời giải thích của đề này rồi");
    if (quote.price !== expectedPrice) throw new AppError(`Giá gói vừa thay đổi (hiện là ${quote.price} credit). Vui lòng kiểm tra lại rồi mở khóa.`, 409);
    if (!aiReady(ai) && quote.price > 0) throw new AppError("Tính năng giải thích AI tạm thời chưa khả dụng", 503);

    // Trừ tiền và ghi nhận mở khóa cùng một transaction; bấm hai lần cùng lúc thì lần sau lỗi trùng và bị hoàn tác (không trừ hai lần)
    try {
      await prisma.$transaction(async (tx) => {
        if (quote.price > 0) {
          await walletService.charge(tx, { userId, amount: quote.price, type: "EXPLAIN_CHARGE", note: `Mở khóa toàn bộ giải thích AI, ${quote.remaining} câu${quote.discountPercent > 0 ? ` (giảm ${quote.discountPercent}%)` : ""}` });
        }
        await explanationRepository.createUnlock(tx, { userId, examId, price: quote.price, questions: quote.remaining });
      });
    } catch (err) {
      if (isDuplicate(err)) throw new AppError("Bạn đã mở khóa toàn bộ lời giải thích của đề này rồi");
      throw err;
    }
    const user = await userRepository.findById(userId);
    return { charged: quote.price, questions: quote.remaining, balanceAfter: user?.balance ?? 0 };
  },

  /**
   * Xem lời giải thích AI của một câu. Mỗi người trả phí MỘT lần cho mỗi câu (xem lại miễn phí). Lời giải được lưu
   * dùng chung: người đầu tiên khiến AI chạy, những người sau vẫn trả phí nhưng chỉ đọc lại bản đã lưu.
   * Trừ phí trước khi gọi AI; AI lỗi thì hoàn phí đúng số đã trừ.
   */
  async explain(actor: Actor, userId: number, examId: number, questionNumber: number, useFreeTurn = false) {
    await examService.assertAccess(actor, examId);

    const question = await examRepository.findQuestionForExplain(examId, questionNumber);
    if (!question) throw AppError.notFound("Không tìm thấy câu hỏi");
    if (question.exam.answerSource !== "AI" && question.exam.answerSource !== "MANUAL") {
      throw new AppError("Đề chưa có đáp án chính thức nên chưa thể giải thích");
    }

    const ai = await aiSettingService.get();
    const saved = await explanationRepository.find(examId, questionNumber);
    if (!saved && !aiReady(ai)) throw new AppError("Tính năng giải thích AI tạm thời chưa khả dụng", 503);

    // Trả phí (nếu chưa mua). Trừ tiền và ghi nhận lượt mua cùng một transaction.
    let charged = 0;
    let trial = false; // lượt xem thử miễn phí (không trừ credit nhưng tính vào số lượt thử)
    let viaTurn = false; // dùng 1 lượt miễn phí nhận từ vượt link
    const unlockedAll = (await explanationRepository.hasUnlocked(userId, examId)) || (PRO_BENEFITS.freeExplain && (await planService.isPro(userId)));
    if (!unlockedAll && !(await explanationRepository.hasPurchased(userId, examId, questionNumber))) {
      try {
        if (useFreeTurn) {
          // Người dùng chủ động dùng lượt miễn phí: trừ 1 lượt (sắp hết hạn trước) và ghi nhận lượt xem cùng một transaction
          await prisma.$transaction(async (tx) => {
            if (!(await linkRewardService.consume(tx, userId, examId, questionNumber))) throw new AppError("Bạn không còn lượt giải thích miễn phí (có thể đã hết hạn)");
            await explanationRepository.createPurchase(tx, { userId, examId, questionNumber, price: 0, isTrial: false });
          });
          viaTurn = true;
        } else {
          trial = ai.explainPrice > 0 && (await explanationRepository.trialsUsed(userId)) < (await promoSettingService.get()).freeTrials;
          await prisma.$transaction(async (tx) => {
            if (ai.explainPrice > 0 && !trial) {
              await walletService.charge(tx, { userId, amount: ai.explainPrice, type: "EXPLAIN_CHARGE", note: `Giải thích AI: ${question.exam.title}, câu ${questionNumber}` });
            }
            await explanationRepository.createPurchase(tx, { userId, examId, questionNumber, price: trial ? 0 : ai.explainPrice, isTrial: trial });
          });
          charged = trial ? 0 : ai.explainPrice;
        }
      } catch (err) {
        trial = false;
        viaTurn = false;
        if (!isDuplicate(err)) throw err; // bấm hai lần cùng lúc: lượt kia đã trả phí, lượt này xem không mất thêm
      }
    }

    let content: string;
    try {
      content = saved?.content ?? (await this.generate(ai, examId, questionNumber, question));
    } catch (err) {
      console.error(`[explain] đề ${question.exam.threadId} câu ${questionNumber} lỗi: ${(err as Error).message}`);
      if (charged > 0) await this.refund(userId, examId, questionNumber, charged);
      else if (trial) await prisma.$transaction((tx) => explanationRepository.deletePurchase(tx, userId, examId, questionNumber)); // AI lỗi: trả lại lượt thử
      else if (viaTurn) {
        // AI lỗi: trả lại lượt miễn phí đã dùng
        await prisma.$transaction(async (tx) => {
          await linkRewardService.restore(tx, userId, examId, questionNumber);
          await explanationRepository.deletePurchase(tx, userId, examId, questionNumber);
        });
      }
      throw new AppError("AI đang bận, chưa tạo được lời giải thích. Bạn không bị trừ credit, vui lòng thử lại sau.", BAD_GATEWAY);
    }

    const user = await userRepository.findById(userId);
    return { content, cached: Boolean(saved), charged, balanceAfter: user?.balance ?? 0, freeTurnUsed: viaTurn, feedback: await explanationFeedbackService.mine(userId, examId, questionNumber) };
  },

  // Gọi AI một lần cho mỗi câu (gộp các yêu cầu cùng lúc) và lưu lại để người sau dùng
  generate(ai: Awaited<ReturnType<typeof aiSettingService.get>>, examId: number, questionNumber: number, question: ExplainQuestion) {
    const key = `${examId}:${questionNumber}`;
    const running = inflight.get(key);
    if (running) return running;

    const job = (async () => {
      const raw = await fs.readFile(path.join(storageDir, EXAM_STORAGE_DIR, question.exam.threadId, "comments.txt"), "utf-8").catch(() => null);
      const content = await explainQuestion(ai, {
        examTitle: question.exam.title,
        ...(await subjectOfExam(question.exam)),
        questionNumber,
        imageFile: path.join(storageDir, question.imagePath),
        correctAnswer: question.answer,
        commentsText: commentsOfQuestion(raw ? compactCommentsText(raw) : null, question.name),
      });
      await explanationRepository.save({ examId, questionNumber, content, model: ai.claudeModel });
      return content;
    })().finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  },

  async refund(userId: number, examId: number, questionNumber: number, amount: number) {
    await prisma.$transaction(async (tx) => {
      await walletService.applyChange(tx, { userId, amount, type: "EXPLAIN_REFUND", note: `Hoàn phí giải thích AI (lỗi), câu ${questionNumber}` });
      await explanationRepository.deletePurchase(tx, userId, examId, questionNumber);
    });
  },
};
