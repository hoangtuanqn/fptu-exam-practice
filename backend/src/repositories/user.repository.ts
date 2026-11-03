import type { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { ListUsersQuery } from "../rules/requests/admin.request";
import { toSkipTake } from "../utils/pagination";
import type { Db } from "./wallet.repository";

// Không bao giờ trả password ra ngoài: mọi truy vấn trả về client dùng select này
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  balance: true,
  emailVerifiedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const userRepository = {
  findById: (id: number, db: Db = prisma) => db.user.findUnique({ where: { id }, select: publicUserSelect }),

  // Có password: chỉ dùng nội bộ (đăng nhập, đổi mật khẩu)
  findByEmailWithPassword: (email: string) => prisma.user.findUnique({ where: { email } }),
  findByIdWithPassword: (id: number) => prisma.user.findUnique({ where: { id } }),

  existsByEmail: async (email: string) => !!(await prisma.user.findUnique({ where: { email }, select: { id: true } })),

  async list(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
      ...(query.search && {
        OR: [{ email: { contains: query.search } }, { fullName: { contains: query.search } }],
      }),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select: publicUserSelect, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  update: (id: number, data: { fullName?: string; role?: Role; status?: UserStatus; emailVerifiedAt?: Date | null }) =>
    prisma.user.update({ where: { id }, data, select: publicUserSelect }),

  countByStatus: () => prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),

  updateProfile: (id: number, data: { fullName: string }) =>
    prisma.user.update({ where: { id }, data, select: publicUserSelect }),

  // Xác minh email xong: đặt (hoặc đổi) email và đánh dấu đã xác minh
  markEmailVerified: (db: Db, id: number, email: string) =>
    db.user.update({ where: { id }, data: { email, emailVerifiedAt: new Date() }, select: { id: true, fullName: true } }),

  updatePassword: (id: number, password: string, db: Db = prisma) => db.user.update({ where: { id }, data: { password } }),

  // Cộng/trừ nguyên tử ở DB (không đọc-rồi-ghi) và trả về số dư mới
  incrementBalance: async (db: Db, id: number, amount: number) => {
    const { balance } = await db.user.update({
      where: { id },
      data: { balance: { increment: amount } },
      select: { balance: true },
    });
    return balance;
  },

  create: (data: { email: string; fullName: string; password: string; role?: Role; status?: UserStatus; referralCode?: string; emailVerifiedAt?: Date }, db: Db = prisma) =>
    db.user.create({ data, select: publicUserSelect }),
};
