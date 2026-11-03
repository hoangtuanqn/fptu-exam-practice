import fs from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { storageDir } from "../configs/env";
import { aiReady } from "../constants/ai";
import { EXAM_STORAGE_DIR } from "../constants/crawler";
import { explanationRepository } from "../repositories/explanation.repository";
import { examRepository } from "../repositories/exam.repository";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { Actor } from "../utils/actor";
import { explainQuestion } from "./ai/question-explainer.service";
import { aiSettingService } from "./ai-setting.service";
import { commentsOfQuestion, compactCommentsText } from "./crawler/comments-file.service";
import { examService } from "./exam.service";
import { walletService } from "./wallet.service";

const BAD_GATEWAY = 502;

// Nhiều người cùng bấm một câu chưa có lời giải: chỉ gọi AI một lần, những người còn lại chờ cùng kết quả
const inflight = new Map<string, Promise<string>>();

const isDuplicate = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export const explanationService = {
  // Phí hiện tại và những câu người dùng đã mua trong một đề (để giao diện hiện "xem lại miễn phí")
  async info(actor: Actor, userId: number, examId: number) {
    await examService.assertAccess(actor, examId);
    const [ai, purchased] = await Promise.all([aiSettingService.get(), explanationRepository.purchasedNumbers(userId, examId)]);
    return { price: ai.explainPrice, purchased };
  },

  /**
   * Xem lời giải thích AI của một câu. Mỗi người trả phí MỘT lần cho mỗi câu (xem lại miễn phí). Lời giải được lưu
   * dùng chung: người đầu tiên khiến AI chạy, những người sau vẫn trả phí nhưng chỉ đọc lại bản đã lưu.
   * Trừ phí trước khi gọi AI; AI lỗi thì hoàn phí đúng số đã trừ.
   */
  async explain(actor: Actor, userId: number, examId: number, questionNumber: number) {
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
    if (!(await explanationRepository.hasPurchased(userId, examId, questionNumber))) {
      try {
        await prisma.$transaction(async (tx) => {
          if (ai.explainPrice > 0) {
            await walletService.charge(tx, { userId, amount: ai.explainPrice, type: "EXPLAIN_CHARGE", note: `Giải thích AI: ${question.exam.title}, câu ${questionNumber}` });
          }
          await explanationRepository.createPurchase(tx, { userId, examId, questionNumber, price: ai.explainPrice });
        });
        charged = ai.explainPrice;
      } catch (err) {
        if (!isDuplicate(err)) throw err; // bấm hai lần cùng lúc: lượt kia đã trả phí, lượt này xem không mất thêm
      }
    }

    let content: string;
    try {
      content = saved?.content ?? (await this.generate(ai, examId, questionNumber, question));
    } catch (err) {
      console.error(`[explain] đề ${question.exam.threadId} câu ${questionNumber} lỗi: ${(err as Error).message}`);
      if (charged > 0) await this.refund(userId, examId, questionNumber, charged);
      throw new AppError("AI đang bận, chưa tạo được lời giải thích. Bạn không bị trừ credit, vui lòng thử lại sau.", BAD_GATEWAY);
    }

    const user = await userRepository.findById(userId);
    return { content, cached: Boolean(saved), charged, balanceAfter: user?.balance ?? 0 };
  },

  // Gọi AI một lần cho mỗi câu (gộp các yêu cầu cùng lúc) và lưu lại để người sau dùng
  generate(ai: Awaited<ReturnType<typeof aiSettingService.get>>, examId: number, questionNumber: number, question: NonNullable<Awaited<ReturnType<typeof examRepository.findQuestionForExplain>>>) {
    const key = `${examId}:${questionNumber}`;
    const running = inflight.get(key);
    if (running) return running;

    const job = (async () => {
      const raw = await fs.readFile(path.join(storageDir, EXAM_STORAGE_DIR, question.exam.threadId, "comments.txt"), "utf-8").catch(() => null);
      const content = await explainQuestion(ai, {
        examTitle: question.exam.title,
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
