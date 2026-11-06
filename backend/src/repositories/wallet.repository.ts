import type { Prisma, PrismaClient, TransactionType } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";

export type Db = PrismaClient | Prisma.TransactionClient;

export const walletRepository = {
  createEntry: (
    db: Db,
    data: { userId: number; type: TransactionType; amount: number; balanceAfter: number; note?: string },
  ) => db.walletTransaction.create({ data }),

  async listByUser(userId: number, query: PaginationQuery) {
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
