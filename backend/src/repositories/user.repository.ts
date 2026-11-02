import type { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

// Không bao giờ trả password ra ngoài: mọi truy vấn trả về client dùng select này
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  balance: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const userRepository = {
  findById: (id: number) => prisma.user.findUnique({ where: { id }, select: publicUserSelect }),

  // Có password: chỉ dùng nội bộ (đăng nhập, đổi mật khẩu)
  findByEmailWithPassword: (email: string) => prisma.user.findUnique({ where: { email } }),
  findByIdWithPassword: (id: number) => prisma.user.findUnique({ where: { id } }),

  existsByEmail: async (email: string) => !!(await prisma.user.findUnique({ where: { email }, select: { id: true } })),

  updateProfile: (id: number, data: { fullName: string }) =>
    prisma.user.update({ where: { id }, data, select: publicUserSelect }),

  updatePassword: (id: number, password: string) => prisma.user.update({ where: { id }, data: { password } }),

  // Cộng/trừ nguyên tử ở DB (không đọc-rồi-ghi) và trả về số dư mới
  incrementBalance: async (db: Db, id: number, amount: number) => {
    const { balance } = await db.user.update({
      where: { id },
      data: { balance: { increment: amount } },
      select: { balance: true },
    });
    return balance;
  },

  create: (data: { email: string; fullName: string; password: string; role?: Role; status?: UserStatus }) =>
    prisma.user.create({ data, select: publicUserSelect }),
};
