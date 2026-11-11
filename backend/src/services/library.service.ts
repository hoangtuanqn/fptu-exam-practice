import { prisma } from "../configs/prisma";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";

// Thư viện đề thi: thao tác chỉnh của admin (kỳ học của môn)
export const libraryService = {
  /** Toàn bộ môn xếp theo kỳ (0-9) để admin quản lý; môn chưa có kỳ nằm ở mục riêng. */
  async semesterBoard() {
    const rows = await prisma.subject.findMany({ select: { code: true, name: true, semester: true }, orderBy: { code: "asc" } });
    return { subjects: rows.map((r) => ({ code: r.code, name: r.name, semester: r.semester })) };
  },

  async setSubjectSemester(code: string, semester: number | null) {
    const subject = await prisma.subject.findUnique({ where: { code: code.toUpperCase() }, select: { id: true } });
    if (!subject) throw new AppError("Không tìm thấy môn này", HTTP_STATUS.NOT_FOUND);
    await prisma.subject.update({ where: { id: subject.id }, data: { semester } });
    return { code: code.toUpperCase(), semester };
  },
};
