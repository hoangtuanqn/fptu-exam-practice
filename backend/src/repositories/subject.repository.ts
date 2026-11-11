import { prisma } from "../configs/prisma";

const SELECT = { id: true, code: true, name: true } as const;

export const subjectRepository = {
  findById: (id: number) => prisma.subject.findUnique({ where: { id }, select: SELECT }),

  /** "12" là id, còn lại là mã môn (không phân biệt hoa thường). Dùng cho lệnh chạy tay. */
  findByIdOrCode: (ref: string) => (/^\d+$/.test(ref) ? prisma.subject.findUnique({ where: { id: Number(ref) }, select: SELECT }) : prisma.subject.findUnique({ where: { code: ref.trim().toUpperCase() }, select: SELECT })),

  listAll: () => prisma.subject.findMany({ select: SELECT, orderBy: { id: "asc" } }),

  findManyByIds: (ids: readonly number[]) => (ids.length ? prisma.subject.findMany({ where: { id: { in: [...ids] } }, select: SELECT }) : Promise.resolve([])),

  findByCode: (code: string) => prisma.subject.findUnique({ where: { code: code.trim().toUpperCase() }, select: SELECT }),

  /** Các chương của môn theo số chương (topics là mảng mục con trong syllabus). */
  chapters: async (subjectId: number) =>
    (await prisma.subjectChapter.findMany({ where: { subjectId }, orderBy: { number: "asc" }, select: { number: true, title: true, topics: true } })).map((c) => ({
      number: c.number,
      title: c.title,
      topics: Array.isArray(c.topics) ? c.topics.filter((t): t is string => typeof t === "string") : [],
    })),
};

export type SubjectRef = NonNullable<Awaited<ReturnType<typeof subjectRepository.findById>>>;
