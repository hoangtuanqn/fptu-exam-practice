import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

export const passwordResetRepository = {
  create: (data: { userId: number; tokenHash: string; expiresAt: Date }) => prisma.passwordResetToken.create({ data }),

  // Token mới nhất của người này, để chặn gửi thư dồn dập
  latestOf: (userId: number) =>
    prisma.passwordResetToken.findFirst({ where: { userId }, orderBy: { id: "desc" }, select: { createdAt: true } }),

  findByHash: (tokenHash: string) => prisma.passwordResetToken.findUnique({ where: { tokenHash } }),

  // Dùng token bằng điều kiện ở DB: chỉ một yêu cầu đổi được usedAt, các yêu cầu đồng thời khác nhận count = 0
  async consume(db: Db, tokenHash: string) {
    const { count } = await db.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return count === 1;
  },

  // Đổi mật khẩu xong thì mọi token còn lại của người này không còn dùng được
  invalidateAll: (db: Db, userId: number) =>
    db.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),

  deleteExpired: () => prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } }),
};
