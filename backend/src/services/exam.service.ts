import { examAttemptRepository } from "../repositories/exam-attempt.repository";
import { examRepository } from "../repositories/exam.repository";
import { userExamRepository } from "../repositories/user-exam.repository";
import { AppError } from "../rules/error";
import { toMeta, type PaginationQuery } from "../utils/pagination";

// Ảnh được phục vụ tĩnh tại /api/v1/files (xem app.ts)
const imageUrlOf = (imagePath: string) => `/api/v1/files/${imagePath}`;

interface Actor {
  id: number;
  role: string;
}

export const examService = {
  // Đề nhập xong (hoặc đã có sẵn) đều vào thư viện của người nhập
  addToLibrary: (userId: number, examId: number) => userExamRepository.add(userId, examId),

  // Chỉ chủ thư viện (hoặc admin) được xem/làm đề; người khác nhận 404 như thể đề không tồn tại
  async assertAccess(actor: Actor, examId: number) {
    if (actor.role === "ADMIN") return;
    if (!(await userExamRepository.has(actor.id, examId))) throw AppError.notFound("Không tìm thấy đề");
  },

  async listMine(userId: number, query: PaginationQuery) {
    const { items, total } = await userExamRepository.list(userId, query);
    const stats = await examAttemptRepository.statsByExam(
      userId,
      items.map((i) => i.exam.id),
    );
    const byExam = new Map(stats.map((s) => [s.examId, s]));

    return {
      items: items.map(({ exam, createdAt }) => ({
        ...exam,
        addedAt: createdAt,
        attempts: byExam.get(exam.id)?._count._all ?? 0,
        bestScore: byExam.get(exam.id)?._max.score ?? null,
      })),
      meta: toMeta(query, total),
    };
  },

  // Dạng giống đề mở từ thư mục: mỗi câu có số, ảnh và đáp án đúng (có thể nhiều đáp án, cách nhau bằng dấu cách)
  async getDetail(actor: Actor, id: number) {
    await this.assertAccess(actor, id);
    const exam = await examRepository.findDetail(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    return {
      id: exam.id,
      threadId: exam.threadId,
      title: exam.title,
      sourceUrl: exam.sourceUrl,
      questions: exam.questions.map((q) => ({
        number: q.number,
        imageUrl: imageUrlOf(q.imagePath),
        correct: q.answer.split(/\s+/).filter(Boolean),
      })),
    };
  },
};
