import type { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { ListUsersQuery } from "../rules/requests/admin.request";
import { toSkipTake } from "../utils/pagination";
import { userCache } from "../utils/user-cache";
import type { Db } from "./wallet.repository";

// Không bao giờ trả password ra ngoài: mọi truy vấn trả về client dùng select này
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarPath: true,
  role: true,
  status: true,
  balance: true,
  proExpiresAt: true,
  emailVerifiedAt: true,
  marketingOptOut: true,
  marketingMutedTopics: true,
  marketingMutedUntil: true,
  deleteRequestedAt: true,
  deletedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type SocialProvider = "google" | "github";

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

// Ghi vào bảng users xong thì bỏ bản lưu tạm dùng khi xác thực request
const fresh = <T>(id: string, result: T): T => {
  userCache.invalidate(id);
  return result;
};

export const userRepository = {
  findById: (id: string, db: Db = prisma) => db.user.findUnique({ where: { id }, select: publicUserSelect }),

  // Có password: chỉ dùng nội bộ (đăng nhập, đổi mật khẩu)
  findByEmailWithPassword: (email: string) => prisma.user.findUnique({ where: { email } }),
  findByIdWithPassword: (id: string) => prisma.user.findUnique({ where: { id } }),

  // Đăng nhập Google: tìm theo mã Google, hoặc theo email để liên kết với tài khoản có sẵn
  findBySocial: (provider: SocialProvider, id: string) =>
    prisma.user.findUnique({ where: provider === "google" ? { googleSub: id } : { githubId: id }, select: { id: true, status: true, deleteRequestedAt: true } }),
  findByEmailForLink: (email: string) => prisma.user.findUnique({ where: { email }, select: { id: true, status: true, emailVerifiedAt: true, deleteRequestedAt: true } }),
  linkSocial: async (id: string, provider: SocialProvider, sub: string, emailVerifiedAt: Date) =>
    fresh(id, await prisma.user.update({ where: { id }, data: { ...(provider === "google" ? { googleSub: sub } : { githubId: sub }), emailVerifiedAt } })),

  // Hồ sơ tối thiểu để xét điều kiện nhập mã giới thiệu
  findReferralProfile: (id: string) => prisma.user.findUnique({ where: { id }, select: { id: true, fullName: true, createdAt: true, referredById: true } }),

  // Links in mails sent before migration 0080 carry the old INT id; 0080 kept its 24 bits in the UUID as "-7hhh-8lll-".
  // Rows migrated by 0080 sort before any later id, so the oldest match wins over a random collision.
  findIdByLegacyId: async (oldId: number) => {
    if (!Number.isInteger(oldId) || oldId <= 0 || oldId >= 2 ** 24) return null;
    const hex = (n: number) => n.toString(16).padStart(3, "0");
    const user = await prisma.user.findFirst({ where: { id: { contains: `-7${hex(oldId >> 12)}-8${hex(oldId & 4095)}-` } }, orderBy: { id: "asc" }, select: { id: true } });
    return user?.id ?? null;
  },

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

  update: async (id: string, data: { fullName?: string; avatarPath?: string | null; role?: Role; status?: UserStatus; emailVerifiedAt?: Date | null }) =>
    fresh(id, await prisma.user.update({ where: { id }, data, select: publicUserSelect })),

  // Tên hiển thị của một nhóm thành viên (trang "đang online")
  findNames: (ids: string[]) => prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, email: true } }),

  countByStatus: () => prisma.user.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
  countDeleted: () => prisma.user.count({ where: { deletedAt: { not: null } } }),

  // Lần hoạt động gần nhất (không có trong publicUserSelect nên không cần xoá cache xác thực)
  touchActive: (id: string, at: Date) => prisma.user.updateMany({ where: { id }, data: { lastActiveAt: at } }),

  // Hủy nhận thư marketing từ liên kết trong thư (tài khoản đã xoá thì không làm gì)
  optOutMarketing: async (id: string) => fresh(id, await prisma.user.updateMany({ where: { id }, data: { marketingOptOut: true } })),

  // Từ liên kết trong thư: tạm dừng tới `until`, hoặc tắt thêm một loại thư (OR bit nguyên tử ở DB, không đọc rồi ghi)
  pauseMarketing: async (id: string, until: Date) => fresh(id, await prisma.user.updateMany({ where: { id }, data: { marketingMutedUntil: until } })),
  muteMarketingTopic: async (id: string, bit: number) =>
    fresh(id, await prisma.$executeRaw`UPDATE users SET marketing_muted_topics = marketing_muted_topics | ${bit} WHERE id = ${id}`),

  updateProfile: async (id: string, data: { fullName?: string; marketingOptOut?: boolean; marketingMutedTopics?: number; marketingMutedUntil?: Date | null }) =>
    fresh(id, await prisma.user.update({ where: { id }, data, select: publicUserSelect })),

  // Xác minh email xong: đặt (hoặc đổi) email và đánh dấu đã xác minh
  markEmailVerified: async (db: Db, id: string, email: string) =>
    fresh(id, await db.user.update({ where: { id }, data: { email, emailVerifiedAt: new Date() }, select: { id: true, fullName: true } })),

  updatePassword: (id: string, password: string, db: Db = prisma) => db.user.update({ where: { id }, data: { password } }),

  // Cộng/trừ nguyên tử ở DB (không đọc-rồi-ghi) và trả về số dư mới
  incrementBalance: async (db: Db, id: string, amount: number) => {
    const { balance } = await db.user.update({
      where: { id },
      data: { balance: { increment: amount } },
      select: { balance: true },
    });
    return fresh(id, balance);
  },

  create: (data: { email: string; fullName: string; password: string; role?: Role; status?: UserStatus; referralCode?: string; emailVerifiedAt?: Date }, db: Db = prisma) =>
    db.user.create({ data, select: publicUserSelect }),
};
