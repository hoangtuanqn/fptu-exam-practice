import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { HTTP_STATUS } from "../constants/httpStatus";
import { NOTICE_CATEGORIES, NOTICE_DEDUPE_MS, NOTICE_KEEP_ALL_DAYS, NOTICE_KEEP_READ_DAYS, NOTICE_KINDS, type NoticeCategory, type NoticeKind } from "../constants/admin-notice";
import { realtimeHub } from "../realtime/hub";
import { AppError } from "../rules/error";
import { type PaginationQuery, toMeta, toSkipTake } from "../utils/pagination";

type Row = Prisma.AdminNoticeGetPayload<object>;

export interface NoticeInput {
  title: string;
  body?: string | null;
  userId?: number | null;
  link?: string | null; // trang admin liên quan, ví dụ /admin/exams/12
}

export interface NoticeListFilter {
  status?: "unread" | "all";
  important?: boolean;
  category?: NoticeCategory;
}

const toDto = (r: Row) => ({
  id: r.id,
  kind: r.kind,
  category: (NOTICE_KINDS[r.kind as NoticeKind]?.category ?? "system") as NoticeCategory,
  level: r.level,
  important: r.important,
  title: r.title,
  body: r.body,
  userId: r.userId,
  link: r.link,
  createdAt: r.createdAt.toISOString(),
  readAt: r.readAt?.toISOString() ?? null,
});
export type NoticeDto = ReturnType<typeof toDto>;

const kindsOf = (category: NoticeCategory) => Object.entries(NOTICE_KINDS).filter(([, v]) => v.category === category).map(([k]) => k);

const whereOf = (f: NoticeListFilter): Prisma.AdminNoticeWhereInput => ({
  ...(f.status === "unread" && { readAt: null }),
  ...(f.important !== undefined && { important: f.important }),
  ...(f.category && { kind: { in: kindsOf(f.category) } }),
});

const recent = new Map<string, number>(); // khóa lỗi -> lúc báo gần nhất (chống báo lặp)
let pushed = 0;

// Dọn thông báo cũ thỉnh thoảng một lần (không cần cron): đã đọc quá hạn ngắn, hoặc chưa đọc quá hạn dài
async function prune() {
  const day = 24 * 60 * 60_000;
  await prisma.adminNotice.deleteMany({
    where: { OR: [{ readAt: { lt: new Date(Date.now() - NOTICE_KEEP_READ_DAYS * day) } }, { createdAt: { lt: new Date(Date.now() - NOTICE_KEEP_ALL_DAYS * day) } }] },
  });
}

export const adminNoticeService = {
  /**
   * Ghi một thông báo cho admin. Gọi ở nơi hành vi của người dùng xảy ra, SAU khi việc chính đã xong.
   * Không bao giờ ném lỗi và không bắt người gọi chờ: thông báo hỏng không được làm hỏng nghiệp vụ.
   */
  push(kind: NoticeKind, input: NoticeInput) {
    void this.save(kind, input).catch((err: Error) => console.error(`[notice] không ghi được thông báo ${kind}: ${err.message}`));
  },

  async save(kind: NoticeKind, input: NoticeInput) {
    const spec = NOTICE_KINDS[kind];
    if (spec.level === "error") {
      const key = `${kind}:${input.title}`;
      const last = recent.get(key);
      if (last && Date.now() - last < NOTICE_DEDUPE_MS) return;
      recent.set(key, Date.now());
      if (recent.size > 500) recent.clear();
    }
    // Có người gây ra sự kiện thì ghi tên + email vào đầu nội dung, để đọc là biết ai (không phải mở trang khác)
    const who = input.userId ? await prisma.user.findUnique({ where: { id: input.userId }, select: { fullName: true, email: true } }) : null;
    const lines = [who ? `${who.fullName} (${who.email})` : input.userId === null ? "Khách" : null, input.body].filter(Boolean);
    const row = await prisma.adminNotice.create({
      data: {
        kind,
        level: spec.level,
        important: spec.important,
        title: input.title.slice(0, 200),
        body: lines.length ? lines.join("\n").slice(0, 500) : null,
        userId: input.userId ?? null,
        link: input.link ? input.link.slice(0, 200) : null,
      },
    });
    realtimeHub.publishAdminNotice(toDto(row));
    if (++pushed % 100 === 0) void prune().catch(() => undefined);
  },

  /** Danh sách có phân trang, kèm số chưa đọc (tổng và quan trọng) để hiện trên tab. */
  async list(query: PaginationQuery, filter: NoticeListFilter) {
    const where = whereOf(filter);
    const [items, total, counts] = await Promise.all([
      prisma.adminNotice.findMany({ where, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.adminNotice.count({ where }),
      this.counts(),
    ]);
    return { items: items.map(toDto), meta: toMeta(query, total), counts };
  },

  async counts() {
    const [unread, importantUnread, byCategory] = await Promise.all([
      prisma.adminNotice.count({ where: { readAt: null } }),
      prisma.adminNotice.count({ where: { readAt: null, important: true } }),
      prisma.adminNotice.groupBy({ by: ["kind"], where: { readAt: null }, _count: { _all: true } }),
    ]);
    const categories = Object.fromEntries(Object.keys(NOTICE_CATEGORIES).map((c) => [c, 0])) as Record<NoticeCategory, number>;
    for (const row of byCategory) categories[NOTICE_KINDS[row.kind as NoticeKind]?.category ?? "system"] += row._count._all;
    return { unread, importantUnread, categories };
  },

  async setRead(id: number, read: boolean) {
    const row = await prisma.adminNotice.findUnique({ where: { id } });
    if (!row) throw new AppError("Không tìm thấy thông báo", HTTP_STATUS.NOT_FOUND);
    const updated = await prisma.adminNotice.update({ where: { id }, data: { readAt: read ? (row.readAt ?? new Date()) : null } });
    return toDto(updated);
  },

  /** Đánh dấu đã đọc hết (theo bộ lọc đang xem nếu có). Trả số thông báo vừa đổi. */
  async readAll(filter: Omit<NoticeListFilter, "status">) {
    const { count } = await prisma.adminNotice.updateMany({ where: { ...whereOf(filter), readAt: null }, data: { readAt: new Date() } });
    return { updated: count };
  },

  /** Xóa các thông báo đã đọc (dọn danh sách). */
  async deleteRead() {
    const { count } = await prisma.adminNotice.deleteMany({ where: { readAt: { not: null } } });
    return { deleted: count };
  },
};
