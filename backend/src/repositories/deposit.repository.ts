import type { DepositStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

const withUser = { user: { select: { id: true, email: true, fullName: true } } } satisfies Prisma.DepositOrderInclude;

export const depositRepository = {
  create: (data: { userId: number; code: string; amount: number; expiresAt: Date }) =>
    prisma.depositOrder.create({ data }),

  findByCode: (db: Db, code: string) => db.depositOrder.findUnique({ where: { code } }),

  // Chiếm lệnh bằng điều kiện ở DB: chỉ một tiến trình đổi được sang PAID, các tiến trình khác nhận count = 0
  async markPaid(db: Db, id: number) {
    const { count } = await db.depositOrder.updateMany({
      where: { id, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date() },
    });
    return count === 1;
  },

  async expireOverdue() {
    const { count } = await prisma.depositOrder.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return count;
  },

  findByIdOfUser: (id: number, userId: number) => prisma.depositOrder.findFirst({ where: { id, userId } }),

  countPending: (userId: number) => prisma.depositOrder.count({ where: { userId, status: "PENDING" } }),

  async list(query: PaginationQuery, filter: { userId?: number; status?: DepositStatus }) {
    const where: Prisma.DepositOrderWhereInput = { userId: filter.userId, status: filter.status };
    const [items, total] = await Promise.all([
      prisma.depositOrder.findMany({ where, include: withUser, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.depositOrder.count({ where }),
    ]);
    return { items, total };
  },
};
