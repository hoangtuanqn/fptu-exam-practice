import type { DepositStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

const withUser = { user: { select: { id: true, email: true, fullName: true } } } satisfies Prisma.DepositOrderInclude;

export const depositRepository = {
  create: (data: { userId: number; code: string; amount: number; expiresAt: Date }) =>
    prisma.depositOrder.create({ data }),

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
