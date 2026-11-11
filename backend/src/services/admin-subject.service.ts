import { prisma } from "../configs/prisma";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";
import { hasNamedChapters } from "../utils/topic-items";

// Quản lý môn học (admin): xem toàn bộ dữ liệu môn trong DB (kỳ, chương, syllabus, số đề...) và chỉnh các trường cơ bản.
const countBy = <T extends { _count: { _all: number } }>(rows: T[], key: (r: T) => string | number | null) => {
  const m = new Map<string | number, number>();
  for (const r of rows) {
    const k = key(r);
    if (k !== null) m.set(k, r._count._all);
  }
  return m;
};

const stringsOf = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const findSubject = async (code: string) => {
  const subject = await prisma.subject.findUnique({ where: { code: code.toUpperCase() } });
  if (!subject) throw new AppError("Không tìm thấy môn này", HTTP_STATUS.NOT_FOUND);
  return subject;
};

export interface SubjectPatch {
  name?: string;
  credits?: number | null;
  semester?: number | null;
}

export const adminSubjectService = {
  /** Một dòng cho mỗi môn, kèm số liệu tổng hợp từ các bảng liên quan. */
  async list() {
    const [subjects, chapters, chunks, inferred, exams, threads, issues] = await Promise.all([
      prisma.subject.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, semester: true, credits: true, minPassMark: true, syllabusId: true } }),
      prisma.subjectChapter.findMany({ select: { subjectId: true, number: true, title: true } }),
      prisma.subjectChunk.groupBy({ by: ["subjectCode"], _count: { _all: true } }),
      prisma.subjectInferredTopic.findMany({ select: { subjectCode: true, topics: true } }),
      prisma.exam.groupBy({ by: ["subjectCode"], _count: { _all: true }, where: { subjectCode: { not: null } } }),
      prisma.fuoThread.groupBy({ by: ["subjectCode"], _count: { _all: true } }),
      prisma.subjectIssue.findMany({ select: { subjectCode: true } }),
    ]);

    const chaptersOf = new Map<number, { number: number; title: string }[]>();
    for (const c of chapters) (chaptersOf.get(c.subjectId) ?? chaptersOf.set(c.subjectId, []).get(c.subjectId)!).push(c);
    const chunkCount = countBy(chunks, (r) => r.subjectCode);
    const examCount = countBy(exams, (r) => r.subjectCode);
    const threadCount = countBy(threads, (r) => r.subjectCode);
    const inferredCount = new Map(inferred.map((r) => [r.subjectCode, Array.isArray(r.topics) ? r.topics.length : 0]));
    const issueCodes = new Set(issues.map((i) => i.subjectCode));

    return {
      subjects: subjects.map((s) => {
        const ch = chaptersOf.get(s.id) ?? [];
        const real = ch.filter((c) => c.number > 0);
        return {
          code: s.code,
          name: s.name,
          semester: s.semester,
          credits: s.credits,
          minPassMark: s.minPassMark === null ? null : Number(s.minPassMark),
          chapters: { total: real.length, named: real.filter((c) => c.title.trim()).length, hasNames: hasNamedChapters(ch) },
          inferredChapters: inferredCount.get(s.code) ?? 0,
          syllabusChunks: chunkCount.get(s.code) ?? 0,
          exams: examCount.get(s.code) ?? 0,
          fuoThreads: threadCount.get(s.code) ?? 0,
          hasIssue: issueCodes.has(s.code),
        };
      }),
    };
  },

  /** Chi tiết một môn: các chương, chương do AI suy ra, các đoạn syllabus. */
  async detail(code: string) {
    const subject = await findSubject(code);
    const [chapters, inferred, chunks, exams, threads] = await Promise.all([
      prisma.subjectChapter.findMany({ where: { subjectId: subject.id }, orderBy: { number: "asc" } }),
      prisma.subjectInferredTopic.findUnique({ where: { subjectCode: subject.code } }),
      prisma.subjectChunk.findMany({ where: { subjectCode: subject.code }, orderBy: { id: "asc" }, select: { kind: true, title: true, content: true } }),
      prisma.exam.count({ where: { subjectCode: subject.code } }),
      prisma.fuoThread.count({ where: { subjectCode: subject.code } }),
    ]);
    return {
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
      credits: subject.credits,
      minPassMark: subject.minPassMark === null ? null : Number(subject.minPassMark),
      syllabusId: subject.syllabusId,
      exams,
      fuoThreads: threads,
      chapters: chapters.map((c) => ({ number: c.number, title: c.title, topics: stringsOf(c.topics) })),
      inferred: inferred ? { topics: inferred.topics as { label: string; hint: string }[], model: inferred.model, at: inferred.updatedAt.toISOString() } : null,
      chunks: chunks.map((c) => ({ kind: c.kind, title: c.title, length: c.content.length })),
    };
  },

  async update(code: string, patch: SubjectPatch) {
    const subject = await findSubject(code);
    await prisma.subject.update({ where: { id: subject.id }, data: patch });
    return this.detail(subject.code);
  },

  /** Xóa bộ chương AI đã suy: lần gắn chương kế tiếp của môn sẽ suy lại từ syllabus hiện tại. */
  async clearInferred(code: string) {
    const subject = await findSubject(code);
    await prisma.subjectInferredTopic.deleteMany({ where: { subjectCode: subject.code } });
    return this.detail(subject.code);
  },
};
