import type { BankTxStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

export const bankTransactionRepository = {
  async findExistingSepayIds(ids: string[]) {
    const rows = await prisma.bankTransaction.findMany({ where: { sepayId: { in: ids } }, select: { sepayId: true } });
    return new Set(rows.map((r) => r.sepayId));
  },

  async sumMatched(since?: Date) {
    const r = await prisma.bankTransaction.aggregate({
      where: { status: "MATCHED", transactionAt: since && { gte: since } },
      _sum: { amountIn: true },
    });
    return r._sum.amountIn ?? 0;
  },

  countUnmatched: () => prisma.bankTransaction.count({ where: { status: "UNMATCHED" } }),

  create: (db: Db, data: Prisma.BankTransactionUncheckedCreateInput) => db.bankTransaction.create({ data }),

  async list(query: PaginationQuery, status?: BankTxStatus) {
    const where: Prisma.BankTransactionWhereInput = { status };
    const [items, total] = await Promise.all([
      prisma.bankTransaction.findMany({ where, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.bankTransaction.count({ where }),
    ]);
    return { items, total };
  },
};
