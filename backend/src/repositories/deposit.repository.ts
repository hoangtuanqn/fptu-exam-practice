import type { DepositStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

// Chỉ các cột giao diện hiển thị; thông tin người tạo chỉ kèm theo khi admin xem
const listSelect = { id: true, code: true, amount: true, status: true, expiresAt: true, paidAt: true, createdAt: true } satisfies Prisma.DepositOrderSelect;
const userSelect = { user: { select: { id: true, email: true, fullName: true } } } satisfies Prisma.DepositOrderSelect;

export const depositRepository = {
  create: (data: { userId: string; code: string; amount: number; expiresAt: Date }) =>
    prisma.depositOrder.create({ data }),

  countByStatus: () => prisma.depositOrder.groupBy({ by: ["status"], _count: { _all: true } }),

  findByCode: (db: Db, code: string) => db.depositOrder.findUnique({ where: { code } }),

  // Chiếm lệnh bằng điều kiện ở DB: chỉ một tiến trình đổi được sang PAID, các tiến trình khác nhận count = 0
  async markPaid(db: Db, id: string) {
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

  // Tra theo mã nạp và luôn kèm userId: người khác biết mã cũng không xem được lệnh của bạn
  findByCodeOfUser: (code: string, userId: string) => prisma.depositOrder.findFirst({ where: { code, userId } }),

  // Lệnh chưa thanh toán, còn hạn, cùng số tiền, tạo trong khoảng gần đây: dùng lại thay vì tạo lệnh thứ hai
  findRecentPending: (userId: string, amount: number, since: Date) =>
    prisma.depositOrder.findFirst({ where: { userId, amount, status: "PENDING", expiresAt: { gt: new Date() }, createdAt: { gte: since } }, orderBy: { id: "desc" } }),

  countPending: (userId: string) => prisma.depositOrder.count({ where: { userId, status: "PENDING" } }),

  async list(query: PaginationQuery, filter: { userId?: string; status?: DepositStatus; q?: string }, withUser = false) {
    const { q } = filter;
    const where: Prisma.DepositOrderWhereInput = {
      userId: filter.userId,
      status: filter.status,
      ...(q && { OR: [{ code: { contains: q } }, { user: { email: { contains: q } } }, { user: { fullName: { contains: q } } }] }),
    };
    const [items, total] = await Promise.all([
      prisma.depositOrder.findMany({
        where,
        select: withUser ? { ...listSelect, ...userSelect } : listSelect,
        orderBy: [...newestFirst(filter.userId !== undefined)],
        ...toSkipTake(query),
      }),
      prisma.depositOrder.count({ where }),
    ]);
    return { items, total };
  },
};
