import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

export const userNoticeSelect = {
  id: true,
  kind: true,
  level: true,
  title: true,
  body: true,
  link: true,
  createdAt: true,
  readAt: true,
} satisfies Prisma.UserNoticeSelect;

export type UserNoticeRow = Prisma.UserNoticeGetPayload<{ select: typeof userNoticeSelect }>;
type NoticeData = { kind: string; level: string; title: string; body?: string | null; link?: string | null };

export const userNoticeRepository = {
  create: (db: Db, userId: string, data: NoticeData) => db.userNotice.create({ data: { ...data, userId }, select: userNoticeSelect }),

  // Đọc bằng kết nối ngoài transaction: chỉ thấy khi transaction ghi nó đã commit
  findCommitted: (id: string) => prisma.userNotice.findUnique({ where: { id }, select: userNoticeSelect }),

  // Dùng index (user_id, created_at)
  async listByUser(userId: string, query: PaginationQuery) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.userNotice.findMany({ where, select: userNoticeSelect, orderBy: [...newestFirst(true)], ...toSkipTake(query) }),
      prisma.userNotice.count({ where }),
    ]);
    return { items, total };
  },

  // Dùng index (user_id, read_at)
  countUnread: (userId: string) => prisma.userNotice.count({ where: { userId, readAt: null } }),

  async markRead(userId: string, ids?: string[]) {
    const { count } = await prisma.userNotice.updateMany({ where: { userId, readAt: null, ...(ids && { id: { in: ids } }) }, data: { readAt: new Date() } });
    return count;
  },

  // Id thành viên đang hoạt động, theo lô (phân trang bằng id, không OFFSET)
  activeUserIds: (afterId: string | null, take: number) =>
    prisma.user
      .findMany({ where: { status: "ACTIVE", deleteRequestedAt: null, ...(afterId && { id: { gt: afterId } }) }, select: { id: true }, orderBy: { id: "asc" }, take })
      .then((rows) => rows.map((r) => r.id)),

  // Unique (user_id, dedupe_key): người đã có thông báo cùng khoá thì bỏ qua; count = số dòng thật sự ghi thêm
  async createForUsers(userIds: string[], data: NoticeData, dedupeKey: string) {
    const { count } = await prisma.userNotice.createMany({ data: userIds.map((userId) => ({ ...data, userId, dedupeKey })), skipDuplicates: true });
    return count;
  },

  // Xóa theo lô (index read_at) để không giữ khóa lâu trên bảng lớn
  async deleteReadBefore(cutoff: Date, batch: number) {
    let total = 0;
    for (;;) {
      const n = await prisma.$executeRaw`DELETE FROM user_notices WHERE read_at < ${cutoff} LIMIT ${batch}`;
      total += n;
      if (n < batch) return total;
    }
  },

  // Chưa đọc quá cũ, theo lô. Index (read_at) chứa sẵn khoá chính id (uuid v7, tăng theo thời gian):
  // read_at IS NULL + ORDER BY id quét từ dòng cũ nhất và dừng ngay khi đủ lô, không quét hết bảng.
  async deleteUnreadBefore(cutoff: Date, batch: number) {
    let total = 0;
    for (;;) {
      const n = await prisma.$executeRaw`DELETE FROM user_notices WHERE read_at IS NULL AND created_at < ${cutoff} ORDER BY id LIMIT ${batch}`;
      total += n;
      if (n < batch) return total;
    }
  },
};
