import { env } from "../configs/env";
import { FLASHCARD_PREVIEW_LIMIT, FLASHCARD_URL_TTL_MS } from "../constants/flashcard";
import { flashcardRepository } from "../repositories/flashcard.repository";
import { signExamFile } from "../utils/exam-path";
import { flashcardFileName, flashcardRel } from "../utils/flashcard";
import { isProUser } from "../utils/pro";

export const flashcardService = {
  listSubjects: () => flashcardRepository.subjectsWithCards().then((items) => ({ items })),

  /**
   * Thẻ của một môn theo số câu. Khách và gói thường chỉ nhận FLASHCARD_PREVIEW_LIMIT thẻ đầu: phần còn lại không rời máy chủ
   * (không có link ảnh cũng không có đáp án), chỉ báo số lượng. Link ảnh ký ngắn hạn cho đúng từng ảnh được phép xem.
   */
  async forSubject(codeRaw: string, user: unknown) {
    const code = codeRaw.toUpperCase();
    const cards = await flashcardRepository.cardsOfSubject(code);
    const full = isProUser(user) || (user as { role?: string } | undefined)?.role === "ADMIN";
    const shown = full ? cards : cards.slice(0, FLASHCARD_PREVIEW_LIMIT);
    const exp = Date.now() + FLASHCARD_URL_TTL_MS;
    return {
      subject: code,
      total: cards.length,
      locked: shown.length < cards.length,
      hidden: cards.length - shown.length,
      items: shown.map((c) => ({
        number: c.number,
        answer: c.answer.split(/\s+/).filter(Boolean),
        imageUrl: `${env.API_URL}/api/v1/flashcards/images/${code}/${flashcardFileName(c.number)}?${signExamFile(flashcardRel(code, c.number), exp, env.JWT_SECRET)}`,
      })),
    };
  },
};
