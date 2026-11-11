import { prisma } from "../configs/prisma";

const SELECT = { id: true, code: true, name: true } as const;

export const subjectRepository = {
  findById: (id: number) => prisma.subject.findUnique({ where: { id }, select: SELECT }),

  /** "12" là id, còn lại là mã môn (không phân biệt hoa thường). Dùng cho lệnh chạy tay. */
  findByIdOrCode: (ref: string) => (/^\d+$/.test(ref) ? prisma.subject.findUnique({ where: { id: Number(ref) }, select: SELECT }) : prisma.subject.findUnique({ where: { code: ref.trim().toUpperCase() }, select: SELECT })),

  listAll: () => prisma.subject.findMany({ select: SELECT, orderBy: { id: "asc" } }),
};

export type SubjectRef = NonNullable<Awaited<ReturnType<typeof subjectRepository.findById>>>;
