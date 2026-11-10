import { prisma } from "../configs/prisma";

export type SubjectIssueKind = "NO_CHAPTER_NAMES";

export const subjectIssueService = {
  /** Ghi (hoặc tăng số lần gặp của) một vấn đề dữ liệu của môn để admin biết mà bổ sung. Không bao giờ ném lỗi. */
  async report(subjectCode: string, kind: SubjectIssueKind) {
    try {
      await prisma.subjectIssue.upsert({
        where: { subjectCode_kind: { subjectCode, kind } },
        create: { subjectCode, kind },
        update: { hits: { increment: 1 } },
      });
    } catch (err) {
      console.error(`[subject-issue] không ghi được báo cáo môn ${subjectCode}: ${(err as Error).message}`);
    }
  },

  async list() {
    const rows = await prisma.subjectIssue.findMany({ orderBy: { updatedAt: "desc" } });
    const subjects = await prisma.subject.findMany({ where: { code: { in: rows.map((r) => r.subjectCode) } }, select: { code: true, name: true } });
    const nameOf = new Map(subjects.map((s) => [s.code, s.name]));
    return rows.map((r) => ({ id: r.id, subjectCode: r.subjectCode, subjectName: nameOf.get(r.subjectCode) ?? null, kind: r.kind, hits: r.hits, firstAt: r.createdAt, lastAt: r.updatedAt }));
  },

  /** Admin đã xử lý (đã bổ sung syllabus): bỏ khỏi danh sách */
  async resolve(id: number) {
    await prisma.subjectIssue.deleteMany({ where: { id } });
  },
};
