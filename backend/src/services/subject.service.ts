import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";
import { hasNamedChapters } from "../utils/topic-items";
import { subjectIssueService } from "./subject-issue.service";

export const NO_CHAPTER_NAMES_MESSAGE = "Môn này chưa có tên chương trong syllabus nên chưa thể làm bộ đề theo chương. Hệ thống đã gửi báo cáo lỗi đến quản trị viên để bổ sung.";

export const subjectService = {
  // Mã + tên mọi môn (cho ô chọn môn)
  list: () => prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } }),

  // Môn có đủ tên chương trong syllabus để làm bộ đề theo chương không. Chưa đủ thì ghi báo cáo cho admin (mỗi lần có người thử là tăng số lần gặp).
  async chapterSetReady(code: string) {
    const subject = await prisma.subject.findUnique({ where: { code: code.toUpperCase() }, select: { code: true, chapters: { select: { number: true, title: true } } } });
    if (!subject) throw AppError.notFound("Không tìm thấy môn học");
    const ok = hasNamedChapters(subject.chapters);
    if (!ok) await subjectIssueService.report(subject.code, "NO_CHAPTER_NAMES");
    return { ok, message: ok ? null : NO_CHAPTER_NAMES_MESSAGE };
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
