import path from "node:path";
import { prisma } from "../configs/prisma";
import { storageDir } from "../configs/env";
import { aiReady, EXPLAIN_EFFORT } from "../constants/ai";
import { ASK_FREE_PER_DAY, ASK_MAX_OUTPUT_TOKENS, ASK_PRO_PER_DAY, ASK_SYSTEM_PROMPT } from "../constants/ask";
import { PRO_BENEFITS } from "../constants/plan";
import { examRepository } from "../repositories/exam.repository";
import { explanationRepository } from "../repositories/explanation.repository";
import { practiceSessionRepository } from "../repositories/practice-session.repository";
import { AppError } from "../rules/error";
import type { AskBody } from "../rules/requests/ask.request";
import type { Actor } from "../utils/actor";
import { isProUser } from "../utils/pro";
import { startOfVnDay } from "../utils/time";
import { askClaudeText, type ClaudeContent } from "./ai/claude.client";
import { loadImageForAi } from "./ai/image";
import { aiSettingService } from "./ai-setting.service";
import { examService } from "./exam.service";

const BAD_GATEWAY = 502;
const proAsk = (user: unknown) => PRO_BENEFITS.askMore && isProUser(user);
const limitFor = (user: unknown) => (proAsk(user) ? ASK_PRO_PER_DAY : ASK_FREE_PER_DAY);

const usedToday = (userId: number) => prisma.questionAsk.count({ where: { userId, createdAt: { gte: startOfVnDay() } } });

export const askService = {
  async quota(userId: number, user: unknown) {
    const limit = limitFor(user);
    return { limit, remaining: Math.max(0, limit - (await usedToday(userId))), pro: proAsk(user) };
  },

  /**
   * Hỏi AI thêm về một câu. Chỉ khi đã được xem đáp án của câu đó: lượt đã nộp, hoặc luyện tập và đã bấm xác nhận câu này
   * (kiểm ở máy chủ, không tin giao diện). Và phải đã có quyền xem lời giải thích câu đó, để không thành đường vòng qua phí giải thích.
   */
  async ask(actor: Actor, user: { id: number }, body: AskBody) {
    const { examId, questionNumber, sessionId, messages } = body;
    await examService.assertAccess(actor, examId);

    const session = await practiceSessionRepository.findOfOwner(actor.owner, sessionId);
    if (!session || session.examId !== examId) throw AppError.notFound("Không tìm thấy lượt làm bài");
    const revealed = session.status === "SUBMITTED" || (session.mode === "PRACTICE" && (session.checked as Record<string, boolean>)[String(questionNumber)] === true);
    if (!revealed) throw new AppError("Bạn nộp bài (hoặc xác nhận đáp án câu này) rồi hãy hỏi AI nhé");

    const question = await examRepository.findQuestionForExplain(examId, questionNumber);
    if (!question) throw AppError.notFound("Không tìm thấy câu hỏi");
    if (question.exam.answerSource !== "AI" && question.exam.answerSource !== "MANUAL") throw new AppError("Đề chưa có đáp án chính thức nên chưa thể hỏi AI");

    const canExplain =
      (PRO_BENEFITS.freeExplain && isProUser(user)) ||
      (await explanationRepository.hasUnlocked(user.id, examId)) ||
      (await explanationRepository.hasPurchased(user.id, examId, questionNumber));
    if (!canExplain) throw new AppError("Hãy xem lời giải thích của câu này trước, rồi hỏi thêm AI nếu còn chưa hiểu");

    const ai = await aiSettingService.get();
    if (!aiReady(ai)) throw new AppError("Tính năng hỏi AI tạm thời chưa khả dụng", 503);

    // Tính lượt trước khi gọi AI; lỗi thì hoàn lại
    const limit = limitFor(user);
    if ((await usedToday(user.id)) >= limit) {
      throw new AppError(proAsk(user) ? `Hôm nay bạn đã dùng hết ${limit} lượt hỏi AI, mai quay lại nhé` : `Hôm nay bạn đã dùng hết ${limit} lượt hỏi AI. Gói Pro có ${ASK_PRO_PER_DAY} lượt mỗi ngày.`, 429);
    }
    const log = await prisma.questionAsk.create({ data: { userId: user.id, examId, questionNumber }, select: { id: true } });

    try {
      const saved = await explanationRepository.find(examId, questionNumber);
      const mine = ((session.answers as Record<string, string[]>)[String(questionNumber)] ?? []).join(" ");
      const image = await loadImageForAi(path.join(storageDir, question.imagePath));
      const content: ClaudeContent[] = [
        { type: "text", text: `<exam>\nTitle: ${question.exam.title || "(unknown)"}\nQuestion number: ${questionNumber}\n</exam>` },
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: `<correct_answer>${question.answer}</correct_answer>` },
        { type: "text", text: mine ? `<student_answer>${mine}</student_answer>` : "<student_answer>(did not answer)</student_answer>" },
      ];
      if (saved) content.push({ type: "text", text: `<explanation>\n${saved.content}\n</explanation>` });
      const transcript = messages.map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`).join("\n\n");
      content.push({ type: "text", text: `<conversation>\n${transcript}\n</conversation>\nAnswer the student's latest message following your instructions.` });

      const reply = await askClaudeText({ apiKey: ai.anthropicApiKey, model: ai.claudeModel, effort: EXPLAIN_EFFORT, system: ASK_SYSTEM_PROMPT, content, maxTokens: ASK_MAX_OUTPUT_TOKENS });
      return { reply, remaining: Math.max(0, limit - (await usedToday(user.id))), limit };
    } catch (err) {
      console.error(`[ask] đề ${examId} câu ${questionNumber} lỗi: ${(err as Error).message}`);
      await prisma.questionAsk.delete({ where: { id: log.id } }).catch(() => undefined);
      throw new AppError("AI đang bận, bạn chưa bị tính lượt hỏi. Thử lại sau ít phút nhé.", BAD_GATEWAY);
    }
  },
};
