import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";
import { baseSubjectCode } from "../utils/subject-code";
import { hasNamedChapters } from "../utils/topic-items";
import { subjectIssueService } from "./subject-issue.service";

const withChapters = { chapters: { orderBy: { number: "asc" as const } } };

export const subjectService = {
  /**
   * Tìm môn kèm các chương, chịu được biến thể mã (PRO192C với PRO192): thử đúng mã, rồi mã gốc, rồi các mã cùng gốc.
   * Ưu tiên môn đầu tiên có đủ tên chương; không môn nào đủ thì trả môn khớp đúng mã (hoặc môn đầu tiên tìm được).
   */
  async findWithChapters(code: string) {
    const exact = code.toUpperCase();
    const base = baseSubjectCode(exact);
    const rows = await prisma.subject.findMany({ where: { OR: [{ code: exact }, { code: base }, { code: { startsWith: base } }] }, include: withChapters });
    const related = rows.filter((r) => baseSubjectCode(r.code) === base);
    const rank = (r: { code: string }) => (r.code === exact ? 0 : r.code === base ? 1 : 2);
    related.sort((a, b) => rank(a) - rank(b));
    return related.find((r) => hasNamedChapters(r.chapters)) ?? related.find((r) => r.code === exact) ?? related[0] ?? null;
  },

  // Mã + tên mọi môn (cho ô chọn môn)
  list: () => prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } }),

  // Không bao giờ chặn người dùng làm bộ đề theo chương: môn thiếu tên chương thì AI tự suy chương từ nội dung syllabus (xem topic-inference).
  // Chỉ khi môn không có chữ nào trong syllabus (không có chương, không có đoạn nội dung) mới ghi báo cáo cho admin bổ sung.
  async chapterSetReady(code: string) {
    const subject = await this.findWithChapters(code);
    if (!subject) throw AppError.notFound("Không tìm thấy môn học");
    if (!hasNamedChapters(subject.chapters)) {
      const chunks = await prisma.subjectChunk.count({ where: { subjectCode: { startsWith: baseSubjectCode(code) } } });
      const hasText = chunks > 0 || subject.chapters.some((c) => Array.isArray(c.topics) && c.topics.length > 0);
      if (!hasText) await subjectIssueService.report(code.toUpperCase(), "NO_CHAPTER_NAMES");
    }
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
