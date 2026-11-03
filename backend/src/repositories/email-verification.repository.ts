import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

export const emailVerificationRepository = {
  create: (data: { userId: number; email: string; tokenHash: string; expiresAt: Date }) => prisma.emailVerificationToken.create({ data, select: { id: true } }),

  // Token mới nhất của người này, để chặn gửi thư dồn dập
  latestOf: (userId: number) => prisma.emailVerificationToken.findFirst({ where: { userId }, orderBy: { id: "desc" }, select: { createdAt: true } }),

  findByHash: (tokenHash: string) =>
    prisma.emailVerificationToken.findUnique({ where: { tokenHash }, select: { userId: true, email: true, usedAt: true, expiresAt: true } }),

  // Dùng token bằng điều kiện ở DB: chỉ một yêu cầu đổi được usedAt, các yêu cầu đồng thời khác nhận count = 0
  async consume(db: Db, tokenHash: string) {
    const { count } = await db.emailVerificationToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return count === 1;
  },

  // Gửi thư mới (hoặc xác minh xong) thì các token cũ chưa dùng của người này không còn hiệu lực
  invalidateAll: (db: Db, userId: number) => db.emailVerificationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
};
