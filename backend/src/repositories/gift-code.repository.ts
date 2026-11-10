import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

// Chỉ lấy đúng các cột giao diện cần
const listSelect = {
  id: true,
  code: true,
  amount: true,
  maxUses: true,
  usedCount: true,
  expiresAt: true,
  active: true,
  note: true,
  creditTtlMinutes: true,
  createdAt: true,
} satisfies Prisma.GiftCodeSelect;

export const giftCodeRepository = {
  create: (data: { code: string; amount: number; maxUses: number; expiresAt?: Date; note?: string; creditTtlMinutes?: number }) =>
    prisma.giftCode.create({ data, select: listSelect }),

  findByCode: (db: Db, code: string) =>
    db.giftCode.findUnique({ where: { code }, select: { id: true, code: true, amount: true, expiresAt: true, active: true, creditTtlMinutes: true } }),

  setActive: (id: number, active: boolean) => prisma.giftCode.update({ where: { id }, data: { active }, select: listSelect }),

  /**
   * Chiếm một lượt dùng bằng MỘT câu UPDATE có điều kiện (còn bật, còn lượt, chưa hết hạn): nhiều người nhập cùng lúc
   * cũng không thể vượt quá maxUses. Trả về true nếu chiếm được.
   */
  async claimUse(db: Db, id: number) {
    const rows = await db.$executeRaw`
      UPDATE gift_codes SET used_count = used_count + 1
      WHERE id = ${id} AND active = 1 AND used_count < max_uses AND (expires_at IS NULL OR expires_at > NOW(3))`;
    return rows === 1;
  },

  createRedemption: (db: Db, data: { giftCodeId: number; userId: number; amount: number }) =>
    db.giftCodeRedemption.create({ data, select: { id: true } }),

  async list(query: PaginationQuery, filter: { q?: string; active?: boolean }) {
    const where: Prisma.GiftCodeWhereInput = {
      active: filter.active,
      code: filter.q ? { contains: filter.q } : undefined,
    };
    const [items, total] = await Promise.all([
      prisma.giftCode.findMany({ where, select: listSelect, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.giftCode.count({ where }),
    ]);
    return { items, total };
  },

  // Ai đã dùng một mã (admin xem)
  async listRedemptions(giftCodeId: number, query: PaginationQuery) {
    const where = { giftCodeId };
    const [items, total] = await Promise.all([
      prisma.giftCodeRedemption.findMany({
        where,
        select: { id: true, amount: true, createdAt: true, user: { select: { id: true, email: true, fullName: true } } },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.giftCodeRedemption.count({ where }),
    ]);
    return { items, total };
  },

  // Các mã một thành viên đã nhập
  async listByUser(userId: number, query: PaginationQuery) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.giftCodeRedemption.findMany({
        where,
        select: { id: true, amount: true, createdAt: true, giftCode: { select: { code: true } } },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.giftCodeRedemption.count({ where }),
    ]);
    return { items, total };
  },
};
