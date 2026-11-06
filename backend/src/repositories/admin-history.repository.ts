import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { ListAttemptsQuery, ListCrawlJobsQuery, ListPurchasesQuery, ListWalletQuery } from "../rules/requests/admin-history.request";
import { newestFirst, toSkipTake } from "../utils/pagination";

export const historyUserSelect = { id: true, email: true, fullName: true } satisfies Prisma.UserSelect;

// Tìm theo email hoặc tên của người dùng
const userFilter = (userId: number | undefined, search: string | undefined): Prisma.UserWhereInput | undefined =>
  search ? { id: userId, OR: [{ email: { contains: search } }, { fullName: { contains: search } }] } : userId ? { id: userId } : undefined;

// Truy vấn lịch sử cho trang quản trị: chỉ đọc, mới nhất trước
export const adminHistoryRepository = {
  async wallet(query: ListWalletQuery) {
    const where: Prisma.WalletTransactionWhereInput = { type: query.type, user: userFilter(query.userId, query.search) };
    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        select: { id: true, type: true, amount: true, balanceAfter: true, note: true, createdAt: true, user: { select: historyUserSelect } },
        orderBy: [...newestFirst(query.userId !== undefined)],
        ...toSkipTake(query),
      }),
      prisma.walletTransaction.count({ where }),
    ]);
    return { items, total };
  },

  // CrawlJob chỉ lưu userId (không có quan hệ), nên lọc theo người dùng bằng cách tìm trước danh sách id khớp
  async matchUserIds(userId: number | undefined, search: string | undefined) {
    const matched = await prisma.user.findMany({ where: userFilter(userId, search), select: { id: true }, take: 500 });
    return matched.map((u) => u.id);
  },

  async crawlJobs(query: ListCrawlJobsQuery, userIds: number[] | undefined) {
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
        orderBy: [...newestFirst(query.userId !== undefined)],
        ...toSkipTake(query),
      }),
      prisma.crawlJob.count({ where }),
    ]);
    return { rows, total };
  },

  // Quan hệ user không khai báo trên CrawlJob nên tra riêng một lần cho cả trang
  usersByIds: (ids: number[]) => (ids.length ? prisma.user.findMany({ where: { id: { in: ids } }, select: historyUserSelect }) : Promise.resolve([])),

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
          user: { select: historyUserSelect },
          exam: { select: { id: true, title: true } },
        },
        orderBy: [...newestFirst(query.userId !== undefined)],
        ...toSkipTake(query),
      }),
      prisma.examAttempt.count({ where }),
    ]);
    return { items, total };
  },

  // Lịch sử tải đề PE
  async peDownloads(query: ListPurchasesQuery) {
    const where: Prisma.PeDownloadWhereInput = { user: userFilter(query.userId, query.search) };
    const [items, total] = await Promise.all([
      prisma.peDownload.findMany({
        where,
        select: { id: true, threadId: true, title: true, price: true, files: true, sizeBytes: true, status: true, error: true, createdAt: true, user: { select: historyUserSelect } },
        orderBy: [...newestFirst(query.userId !== undefined)],
        ...toSkipTake(query),
      }),
      prisma.peDownload.count({ where }),
    ]);
    return { items, total };
  },

  // Gói "mở khóa toàn bộ lời giải" đã bán
  async explanationUnlocks(query: ListPurchasesQuery) {
    const where: Prisma.ExplanationUnlockWhereInput = { user: userFilter(query.userId, query.search) };
    const [items, total] = await Promise.all([
      prisma.explanationUnlock.findMany({
        where,
        select: { id: true, price: true, questions: true, createdAt: true, user: { select: historyUserSelect }, exam: { select: { id: true, title: true } } },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.explanationUnlock.count({ where }),
    ]);
    return { items, total };
  },

  // Mua lẻ lời giải từng câu (kèm lượt xem thử miễn phí)
  async explanationPurchases(query: ListPurchasesQuery) {
    const where: Prisma.ExplanationPurchaseWhereInput = { user: userFilter(query.userId, query.search) };
    const [items, total] = await Promise.all([
      prisma.explanationPurchase.findMany({
        where,
        select: { id: true, questionNumber: true, price: true, isTrial: true, createdAt: true, user: { select: historyUserSelect }, exam: { select: { id: true, title: true } } },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.explanationPurchase.count({ where }),
    ]);
    return { items, total };
  },
};
