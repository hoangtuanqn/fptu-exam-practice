import path from "node:path";
import { storageDir } from "../configs/env";
import { aiReady, CHAT_FREE_DAILY, CHAT_PRO_DAILY_SAFETY } from "../constants/ai";
import { HTTP_STATUS } from "../constants/httpStatus";
import { PRO_BENEFITS } from "../constants/plan";
import { examRepository } from "../repositories/exam.repository";
import { explainChatUsageRepository } from "../repositories/explain-chat-usage.repository";
import { explanationRepository } from "../repositories/explanation.repository";
import { AppError } from "../rules/error";
import type { Actor } from "../utils/actor";
import { DAY_MS, startOfVnDay, vnDate } from "../utils/time";
import { ClaudeTruncatedError } from "./ai/claude.client";
import { chatAboutQuestion, type ChatMessage } from "./ai/question-chat.service";
import { aiSettingService } from "./ai-setting.service";
import { examService } from "./exam.service";
import { subjectOfExam } from "./explanation.service";
import { planService } from "./plan.service";

export const CHAT_QUOTA_EXCEEDED = "CHAT_QUOTA_EXCEEDED";

export interface ChatQuota {
  limit: number | null; // null: không giới hạn (Pro)
  used: number;
  remaining: number | null;
  resetsAt: string; // 0h ngày mai theo giờ Việt Nam (ISO)
  unlimited: boolean;
}

const quotaOf = (used: number, pro: boolean, now = Date.now()): ChatQuota => ({
  limit: pro ? null : CHAT_FREE_DAILY,
  used,
  remaining: pro ? null : Math.max(0, CHAT_FREE_DAILY - used),
  resetsAt: new Date(startOfVnDay(now).getTime() + DAY_MS).toISOString(),
  unlimited: pro,
});

// Hỏi AI về một câu đã xem lời giải: không tính thêm credit (thuộc lời giải đã trả), giới hạn số tin mỗi ngày
export const explainChatService = {
  async quota(userId: number): Promise<ChatQuota> {
    const [pro, used] = await Promise.all([planService.isPro(userId), explainChatUsageRepository.used(userId, vnDate())]);
    return quotaOf(used, pro);
  },

  async chat(actor: Actor, userId: number, examId: number, questionNumber: number, messages: ChatMessage[]) {
    await examService.assertAccess(actor, examId);
    const question = await examRepository.findQuestionForExplain(examId, questionNumber);
    if (!question) throw AppError.notFound("Không tìm thấy câu hỏi");

    const pro = await planService.isPro(userId);
    const entitled =
      (PRO_BENEFITS.freeExplain && pro) || (await explanationRepository.hasUnlocked(userId, examId)) || (await explanationRepository.hasPurchased(userId, examId, questionNumber));
    if (!entitled) throw AppError.forbidden("Bạn cần mở lời giải của câu này trước khi hỏi AI");

    const saved = await explanationRepository.find(examId, questionNumber);
    if (!saved) throw new AppError("Câu này chưa có lời giải, hãy xem lời giải trước khi hỏi AI");

    const ai = await aiSettingService.get();
    if (!aiReady(ai)) throw new AppError("Tính năng hỏi AI tạm thời chưa khả dụng", HTTP_STATUS.SERVICE_UNAVAILABLE);

    // Giữ lượt trước khi gọi AI (cập nhật có điều kiện nên song song cũng không vượt), AI lỗi thì trả lại
    const day = vnDate();
    if (!(await explainChatUsageRepository.reserve(userId, day, pro ? CHAT_PRO_DAILY_SAFETY : CHAT_FREE_DAILY))) {
      if (pro) throw new AppError("Hôm nay bạn đã hỏi AI rất nhiều, vui lòng quay lại vào ngày mai nhé.", HTTP_STATUS.TOO_MANY_REQUESTS);
      throw new AppError(
        `Bạn đã dùng hết ${CHAT_FREE_DAILY} lượt hỏi AI hôm nay. Lượt mới có lúc 0h, hoặc nâng cấp Pro để hỏi không giới hạn.`,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        undefined,
        CHAT_QUOTA_EXCEEDED,
        { quota: quotaOf(await explainChatUsageRepository.used(userId, day), false) },
      );
    }

    let reply: string;
    try {
      reply = await chatAboutQuestion(
        ai,
        {
          examTitle: question.exam.title,
          ...(await subjectOfExam(question.exam)),
          questionNumber,
          imageFile: path.join(storageDir, question.imagePath),
          correctAnswer: question.answer,
          explanation: saved.content,
          messages,
        },
        (u) => console.log(`[explain-chat] đề ${examId} câu ${questionNumber} in=${u.input} cache_read=${u.cacheRead} cache_write=${u.cacheCreation} out=${u.output}`),
      );
    } catch (err) {
      console.error(`[explain-chat] đề ${examId} câu ${questionNumber} lỗi: ${(err as Error).message}`);
      // Bị cắt vì quá dài thì token đã tốn: vẫn tính lượt (không thì hỏi "viết thật dài" mãi không hết lượt)
      if (err instanceof ClaudeTruncatedError) throw new AppError("Câu trả lời quá dài nên bị cắt. Hãy hỏi cụ thể hơn một ý (lượt này vẫn được tính).");
      await explainChatUsageRepository.release(userId, day);
      throw new AppError("AI đang bận, chưa trả lời được. Lượt hỏi này không bị tính, vui lòng thử lại sau.", HTTP_STATUS.BAD_GATEWAY);
    }

    return { reply, quota: quotaOf(await explainChatUsageRepository.used(userId, day), pro) };
  },
};
