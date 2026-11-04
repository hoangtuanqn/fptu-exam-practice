import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { ListAttemptsQuery, ListCrawlJobsQuery, ListWalletQuery } from "../rules/requests/admin-history.request";
import { toMeta, toSkipTake } from "../utils/pagination";

const userSelect = { select: { id: true, email: true, fullName: true } } as const;

// Tìm theo email hoặc tên của người dùng
const userFilter = (userId: number | undefined, search: string | undefined): Prisma.UserWhereInput | undefined =>
  search ? { id: userId, OR: [{ email: { contains: search } }, { fullName: { contains: search } }] } : userId ? { id: userId } : undefined;

export const adminHistoryService = {
  // Sổ cái ví của mọi người dùng: xem được vì sao số dư đổi
  async wallet(query: ListWalletQuery) {
    const where: Prisma.WalletTransactionWhereInput = { type: query.type, user: userFilter(query.userId, query.search) };
    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        select: { id: true, type: true, amount: true, balanceAfter: true, note: true, createdAt: true, user: userSelect },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.walletTransaction.count({ where }),
    ]);
    return { items, meta: toMeta(query, total) };
  },

  // Lịch sử lấy đề: ai lấy, đề nào, trạng thái, phí và lỗi (nếu có). Khách chưa đăng nhập không có user.
  async crawlJobs(query: ListCrawlJobsQuery) {
    // CrawlJob chỉ lưu userId (không có quan hệ), nên lọc theo người dùng bằng cách tìm trước danh sách id khớp
    let userIds: number[] | undefined;
    if (query.userId || query.search) {
      const matched = await prisma.user.findMany({ where: userFilter(query.userId, query.search), select: { id: true }, take: 500 });
      userIds = matched.map((u) => u.id);
    }
    const where: Prisma.CrawlJobWhereInput = { status: query.status, ...(userIds && { userId: { in: userIds } }) };
    const [rows, total] = await Promise.all([
      prisma.crawlJob.findMany({
        where,
        select: {
          id: true,
          userId: true,
          threadId: true,
          status: true,
          stage: true,
          error: true,
          chargedAmount: true,
          guestId: true,
          createdAt: true,
          finishedAt: true,
          exam: { select: { id: true, title: true } },
        },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.crawlJob.count({ where }),
    ]);
    // Quan hệ user không khai báo trên CrawlJob nên tra riêng một lần cho cả trang
    const ids = [...new Set(rows.map((r) => r.userId).filter((v): v is number => v != null))];
    const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect.select }) : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      items: rows.map(({ guestId, userId, ...r }) => ({ ...r, guest: guestId !== null && userId === null, user: userId ? (byId.get(userId) ?? null) : null })),
      meta: toMeta(query, total),
    };
  },

  async attempts(query: ListAttemptsQuery) {
    const where: Prisma.ExamAttemptWhereInput = { mode: query.mode, user: userFilter(query.userId, query.search) };
    const [items, total] = await Promise.all([
      prisma.examAttempt.findMany({
        where,
        select: {
          id: true,
          mode: true,
          score: true,
          correct: true,
          wrong: true,
          skipped: true,
          totalGraded: true,
          durationSec: true,
          createdAt: true,
          user: userSelect,
          exam: { select: { id: true, title: true } },
        },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.examAttempt.count({ where }),
    ]);
    return { items, meta: toMeta(query, total) };
  },
};
