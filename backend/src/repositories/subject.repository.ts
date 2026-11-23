import { prisma } from "../configs/prisma";

const SELECT = { id: true, code: true, name: true } as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const subjectRepository = {
  findById: (id: string) => prisma.subject.findUnique({ where: { id }, select: SELECT }),
  // Tìm môn theo mã hoặc tên (ô tìm kiếm chung)
  search: (q: string, take: number) =>
    prisma.subject.findMany({
      where: { OR: [{ code: { contains: q.toUpperCase() } }, { name: { contains: q } }] },
      orderBy: { code: "asc" },
      take,
      select: { code: true, name: true },
    }),

  /** Một UUID là id, còn lại là mã môn (không phân biệt hoa thường). Dùng cho lệnh chạy tay. */
  findByIdOrCode: (ref: string) => (UUID_RE.test(ref.trim()) ? prisma.subject.findUnique({ where: { id: ref.trim().toLowerCase() }, select: SELECT }) : prisma.subject.findUnique({ where: { code: ref.trim().toUpperCase() }, select: SELECT })),

  listAll: () => prisma.subject.findMany({ select: SELECT, orderBy: { id: "asc" } }),

  findManyByIds: (ids: readonly string[]) => (ids.length ? prisma.subject.findMany({ where: { id: { in: [...ids] } }, select: SELECT }) : Promise.resolve([])),

  findByCode: (code: string) => prisma.subject.findUnique({ where: { code: code.trim().toUpperCase() }, select: SELECT }),

  /** Các chương của môn theo số chương (topics là mảng mục con trong syllabus). */
  chapters: async (subjectId: string) =>
    (await prisma.subjectChapter.findMany({ where: { subjectId }, orderBy: { number: "asc" }, select: { number: true, title: true, topics: true } })).map((c) => ({
      number: c.number,
      title: c.title,
      topics: Array.isArray(c.topics) ? c.topics.filter((t): t is string => typeof t === "string") : [],
    })),
};

export type SubjectRef = NonNullable<Awaited<ReturnType<typeof subjectRepository.findById>>>;
