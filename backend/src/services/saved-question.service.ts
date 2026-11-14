import { USABLE_ANSWER_SOURCES } from "../constants/exam";
import { SAVED_QUESTIONS_MAX } from "../constants/saved-question";
import { savedQuestionRepository } from "../repositories/saved-question.repository";
import { userExamRepository } from "../repositories/user-exam.repository";
import { AppError } from "../rules/error";
import { fileUrlOf } from "../utils/file-url";
import { toMeta, type PaginationQuery } from "../utils/pagination";

// Câu người dùng tự lưu để xem lại (kho cá nhân, khác Sổ câu sai: không lịch ôn, không giới hạn theo gói)

const USABLE = new Set<string>(USABLE_ANSWER_SOURCES);
const answersOf = (answer: string) => answer.split(/\s+/).filter(Boolean);

export const savedQuestionService = {
  /** Lưu một câu của đề trong kho của người dùng; lưu lại câu đã lưu không lỗi. `max` truyền vào được để test. */
  async save(userId: number, examId: number, questionNumber: number, max: number = SAVED_QUESTIONS_MAX) {
    // Đề ngoài kho của mình: 404 như mọi API đề khác (không lộ đề có tồn tại hay không)
    if (!(await userExamRepository.has({ userId }, examId))) throw AppError.notFound("Không tìm thấy đề");
    if (!(await savedQuestionRepository.questionExists(examId, questionNumber))) throw AppError.notFound("Không tìm thấy câu hỏi");
    if (await savedQuestionRepository.isSaved(userId, examId, questionNumber)) return { saved: true };
    // shortcut: đếm rồi mới thêm nên hai yêu cầu song song có thể vượt trần vài câu; chỉ là chống lạm dụng nên chấp nhận
    if ((await savedQuestionRepository.count(userId)) >= max) throw AppError.conflict("Bạn đã lưu quá nhiều câu, hãy bỏ bớt câu cũ");
    await savedQuestionRepository.add(userId, examId, questionNumber);
    return { saved: true };
  },

  async remove(userId: number, examId: number, questionNumber: number) {
    await savedQuestionRepository.remove(userId, examId, questionNumber);
    return { saved: false };
  },

  numbersOfExam: (userId: number, examId: number) => savedQuestionRepository.numbersOfExam(userId, examId),

  async list(userId: number, query: PaginationQuery & { subject?: string }) {
    const { rows, total } = await savedQuestionRepository.list(userId, query);
    const questions = await savedQuestionRepository.questionsOf(rows);
    return {
      items: rows.map((r) => {
        const q = questions.get(`${r.examId}:${r.questionNumber}`);
        return {
          id: r.id,
          examId: r.examId,
          examTitle: r.exam.title,
          threadId: r.exam.threadId,
          subjectCode: r.exam.subjectCode,
          number: r.questionNumber,
          imageUrl: q ? fileUrlOf(q.imagePath) : null, // câu đã bị xoá khỏi đề (hiếm): vẫn hiện để bỏ lưu được
          correct: q && USABLE.has(r.exam.answerSource) ? answersOf(q.answer) : [], // đề chưa có đáp án thật: không hiện đáp án tạm
          topic: q?.topic ?? null,
          savedAt: r.createdAt,
        };
      }),
      meta: toMeta(query, total),
    };
  },
};
