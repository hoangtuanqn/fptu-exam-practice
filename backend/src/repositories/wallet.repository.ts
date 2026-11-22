import type { Prisma, PrismaClient, TransactionType } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";

export type Db = PrismaClient | Prisma.TransactionClient;

export const walletRepository = {
  createEntry: (
    db: Db,
    data: { userId: string; type: TransactionType; amount: number; balanceAfter: number; note?: string },
  ) => db.walletTransaction.create({ data }),

  // Trong danh sách, những người đã có dòng sổ cái cùng loại và cùng ghi chú (để chạy lại việc cộng hàng loạt mà không cộng trùng)
  async userIdsWithEntry(db: Db, userIds: string[], type: TransactionType, note: string) {
    const rows = await db.walletTransaction.findMany({ where: { userId: { in: userIds }, type, note }, select: { userId: true } });
    return new Set(rows.map((r) => r.userId));
  },

  async listByUser(userId: string, query: PaginationQuery) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        select: { id: true, type: true, amount: true, balanceAfter: true, note: true, createdAt: true },
        orderBy: [...newestFirst(true)],
        ...toSkipTake(query),
      }),
      prisma.walletTransaction.count({ where }),
    ]);
    return { items, total };
  },
};
