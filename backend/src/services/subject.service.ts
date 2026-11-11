import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";

export const subjectService = {
  // Tìm môn kèm các chương theo đúng mã (PRO192C và PRO192 là hai môn khác nhau, không lấy lẫn)
  findWithChapters: (code: string) => prisma.subject.findUnique({ where: { code: code.toUpperCase() }, include: { chapters: { orderBy: { number: "asc" } } } }),

  // Mã + tên mọi môn (cho ô chọn môn)
  list: () => prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } }),

  // Không bao giờ chặn người dùng làm bộ đề theo chương: môn thiếu tên chương thì AI suy chương từ nội dung syllabus của chính môn đó rồi lưu lại (xem topic-inference).
  async chapterSetReady(code: string) {
    const subject = await this.findWithChapters(code);
    if (!subject) throw AppError.notFound("Không tìm thấy môn học");
    return { ok: true, message: null as string | null };
  },

  // Thông tin công khai của một môn cho trang /mon/<mã>: tên, các chương theo syllabus và số đề hệ thống đang có
  async info(code: string) {
    const subject = await prisma.subject.findUnique({
      where: { code: code.toUpperCase() },
      select: { code: true, name: true, chapters: { orderBy: { number: "asc" }, select: { number: true, title: true } } },
    });
    if (!subject) throw AppError.notFound("Không tìm thấy môn học");
    const exams = await prisma.exam.count({ where: { title: { contains: subject.code }, answerSource: { in: ["AI", "MANUAL"] } } });
    return { code: subject.code, name: subject.name, chapters: subject.chapters.filter((c) => c.number > 0), exams };
  },
};
