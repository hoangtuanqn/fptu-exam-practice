import type { Prisma, ReferralRewardType } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

export const referralRepository = {
  // Người sở hữu mã giới thiệu (mã đã được chuẩn hóa chữ hoa)
  findOwnerByCode: (db: Db, code: string) => db.user.findUnique({ where: { referralCode: code }, select: { id: true, status: true } }),

  codeExists: async (code: string) => (await prisma.user.count({ where: { referralCode: code } })) > 0,

  findCodeOf: (userId: number) => prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),

  setCode: (userId: number, referralCode: string) => prisma.user.update({ where: { id: userId }, data: { referralCode }, select: { referralCode: true } }),

  // Gắn người giới thiệu cho người vừa đăng ký
  setReferrer: (db: Db, userId: number, referredById: number) => db.user.update({ where: { id: userId }, data: { referredById } }),

  findReferrerOf: (db: Db, userId: number) => db.user.findUnique({ where: { id: userId }, select: { referredById: true } }),

  createReward: (db: Db, data: { referrerId: number; referredId: number; type: ReferralRewardType; amount: number; depositOrderId?: number }) =>
    db.referralReward.create({ data, select: { id: true } }),

  // Tổng hoa hồng + thưởng người giới thiệu đã nhận, và số người đã giới thiệu
  async statsOf(referrerId: number) {
    const [referred, earned] = await Promise.all([
      prisma.user.count({ where: { referredById: referrerId } }),
      prisma.referralReward.aggregate({ where: { referrerId, type: { in: ["DEPOSIT_COMMISSION", "REFERRER_BONUS"] } }, _sum: { amount: true } }),
    ]);
    return { referred, earned: earned._sum.amount ?? 0 };
  },

  // Hoa hồng đã nhận từ từng người được giới thiệu (cho các id trong một trang)
  async commissionByReferred(referredIds: number[]) {
    if (referredIds.length === 0) return new Map<number, number>();
    const rows = await prisma.referralReward.groupBy({
      by: ["referredId"],
      where: { referredId: { in: referredIds }, type: { in: ["DEPOSIT_COMMISSION", "REFERRER_BONUS"] } },
      _sum: { amount: true },
    });
    return new Map(rows.map((r) => [r.referredId, r._sum.amount ?? 0]));
  },

  // Những người một thành viên đã giới thiệu (chỉ các cột cần)
  async listReferred(referrerId: number, query: PaginationQuery) {
    const where: Prisma.UserWhereInput = { referredById: referrerId };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select: { id: true, fullName: true, email: true, createdAt: true }, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  // Admin: mọi cặp người giới thiệu - người được giới thiệu
  async listAll(query: PaginationQuery) {
    const where: Prisma.UserWhereInput = { referredById: { not: null } };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, fullName: true, email: true, createdAt: true, referredBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  async summary() {
    const [referred, byType] = await Promise.all([
      prisma.user.count({ where: { referredById: { not: null } } }),
      prisma.referralReward.groupBy({ by: ["type"], _sum: { amount: true } }),
    ]);
    const paid = (t: ReferralRewardType) => byType.find((r) => r.type === t)?._sum.amount ?? 0;
    return {
      referred,
      signupBonusPaid: paid("SIGNUP_BONUS") + paid("REFERRER_BONUS"),
      commissionPaid: paid("DEPOSIT_COMMISSION"),
    };
  },
};
