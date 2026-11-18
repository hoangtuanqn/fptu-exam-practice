import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

export const refreshTokenRepository = {
  create: (data: { userId: string; tokenHash: string; familyId: string; expiresAt: Date; userAgent?: string; ip?: string }) =>
    prisma.refreshToken.create({ data }),

  findByHash: (tokenHash: string) => prisma.refreshToken.findUnique({ where: { tokenHash } }),

  // Thu hồi bằng điều kiện ở DB: hai yêu cầu cùng lúc chỉ một cái đổi được revokedAt
  async revoke(id: number) {
    const { count } = await prisma.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    return count === 1;
  },

  // Xoá hẳn (không chỉ đánh dấu): token đã xoá thì không còn dùng được kể cả trong khoảng châm chước lúc xoay vòng
  deleteFamily: (familyId: string) => prisma.refreshToken.deleteMany({ where: { familyId } }),

  deleteAllOfUser: (userId: string, db: Db = prisma) => db.refreshToken.deleteMany({ where: { userId } }),

  deleteExpired: async () => (await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })).count,
};
