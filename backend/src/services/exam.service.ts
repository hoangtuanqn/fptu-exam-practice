import { examAttemptRepository } from "../repositories/exam-attempt.repository";
import { examRepository } from "../repositories/exam.repository";
import { userExamRepository } from "../repositories/user-exam.repository";
import type { Db } from "../repositories/wallet.repository";
import { examSolveService } from "./exam-solve.service";
import { AppError } from "../rules/error";
import { isMember, type Actor, type Owner } from "../utils/actor";
import { toMeta, type PaginationQuery } from "../utils/pagination";

// Ảnh được phục vụ tĩnh tại /api/v1/files (xem app.ts)
const imageUrlOf = (imagePath: string) => `/api/v1/files/${imagePath}`;

export const examService = {
  // Đề nhập xong (hoặc đã có sẵn) đều vào kho của người nhập: thành viên hoặc khách
  addToLibrary: (owner: Owner, examId: number, db?: Db) => userExamRepository.add(owner, examId, db),

  // Chỉ chủ kho (hoặc admin) được xem/làm đề; người khác nhận 404 như thể đề không tồn tại
  async assertAccess(actor: Actor, examId: number) {
    if (actor.isAdmin) return;
    if (!(await userExamRepository.has(actor.owner, examId))) throw AppError.notFound("Không tìm thấy đề");
  },

  async listMine(owner: Owner, query: PaginationQuery) {
    const { items, total } = await userExamRepository.list(owner, query);
    // Khách chưa có lịch sử làm bài nên không cần thống kê
    const stats = isMember(owner)
      ? await examAttemptRepository.statsByExam(
          owner.userId,
          items.map((i) => i.exam.id),
        )
      : [];
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
    await examSolveService.upgradeIfNeeded(id);
    const exam = await examRepository.findDetail(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    return {
      id: exam.id,
      threadId: exam.threadId,
      title: exam.title,
      sourceUrl: exam.sourceUrl,
      answerStatus: exam.answerSource, // PENDING = AI đang phân tích đáp án, làm bài trước được
      questions: exam.questions.map((q) => ({
        number: q.number,
        imageUrl: imageUrlOf(q.imagePath),
        correct: q.answer.split(/\s+/).filter(Boolean),
      })),
    };
  },

  // Giao diện hỏi lại định kỳ trong lúc AI phân tích: chỉ trả trạng thái và đáp án, nhẹ hơn tải cả đề
  async getAnswers(actor: Actor, id: number) {
    await this.assertAccess(actor, id);
    const exam = await examRepository.findAnswers(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    return {
      status: exam.answerSource,
      answers: exam.questions.map((q) => ({ number: q.number, correct: q.answer.split(/\s+/).filter(Boolean) })),
    };
  },

  // Địa chỉ /exam/:threadId dùng mã thread (thông tin công khai trên FuOverflow) thay cho ID nội bộ tăng dần.
  // Không có đề, hoặc có nhưng không nằm trong kho của người xem, đều trả cùng một lỗi 404.
  async getDetailByThread(actor: Actor, threadId: string) {
    const exam = await examRepository.findByThreadId(threadId);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    return this.getDetail(actor, exam.id);
  },

  // Vừa đăng ký/đăng nhập: đề khách đã lấy trên trình duyệt này chuyển về tài khoản
  async claimGuestLibrary(userId: number, guestId: string | undefined) {
    if (!guestId) return { claimed: 0 };
    return { claimed: await userExamRepository.claimGuest(userId, guestId) };
  },
};
