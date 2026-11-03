import { prisma } from "../configs/prisma";
import type { Owner } from "../utils/actor";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

const whereOf = (owner: Owner) => ("userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId });

export const userExamRepository = {
  // Đã có thì bỏ qua, nhập lại cùng đề không lỗi
  add: (owner: Owner, examId: number, db: Db = prisma) =>
    db.userExam.createMany({ data: [{ ...whereOf(owner), examId }], skipDuplicates: true }),

  has: async (owner: Owner, examId: number) => (await prisma.userExam.count({ where: { ...whereOf(owner), examId } })) > 0,

  async list(owner: Owner, query: PaginationQuery) {
    const where = whereOf(owner);
    const [items, total] = await Promise.all([
      prisma.userExam.findMany({
        where,
        include: { exam: { select: { id: true, title: true, threadId: true, totalQuestions: true, answerSource: true } } },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.userExam.count({ where }),
    ]);
    return { items, total };
  },

  // Chuyển toàn bộ đề của khách sang tài khoản (đã có thì bỏ qua) rồi xoá bản của khách, trong một transaction
  claimGuest: (userId: number, guestId: string) =>
    prisma.$transaction(async (tx) => {
      const rows = await tx.userExam.findMany({ where: { guestId }, select: { examId: true } });
      if (rows.length === 0) return 0;
      await tx.userExam.createMany({ data: rows.map((r) => ({ userId, examId: r.examId })), skipDuplicates: true });
      await tx.userExam.deleteMany({ where: { guestId } });
      return rows.length;
    }),
};
