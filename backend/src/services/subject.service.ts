import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";

export const subjectService = {
  // Mã + tên mọi môn (cho ô chọn môn)
  list: () => prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } }),

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
