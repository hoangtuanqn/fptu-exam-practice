import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

export const userExamRepository = {
  // Đã có thì bỏ qua, nhập lại cùng đề không lỗi
  add: (userId: number, examId: number, db: Db = prisma) =>
    db.userExam.createMany({ data: [{ userId, examId }], skipDuplicates: true }),

  has: async (userId: number, examId: number) =>
    (await prisma.userExam.count({ where: { userId, examId } })) > 0,

  async list(userId: number, query: PaginationQuery) {
    const [items, total] = await Promise.all([
      prisma.userExam.findMany({
        where: { userId },
        include: { exam: { select: { id: true, title: true, threadId: true, totalQuestions: true } } },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.userExam.count({ where: { userId } }),
    ]);
    return { items, total };
  },
};
