import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";

// Ảnh được phục vụ tĩnh tại /api/v1/files (xem app.ts)
const imageUrlOf = (imagePath: string) => `/api/v1/files/${imagePath}`;

export const examService = {
  // Dạng giống đề mở từ thư mục: mỗi câu có số, ảnh và đáp án đúng (có thể nhiều đáp án, cách nhau bằng dấu cách)
  async getDetail(id: number) {
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
