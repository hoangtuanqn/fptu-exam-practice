import { adminHistoryRepository } from "../repositories/admin-history.repository";
import type { ListAttemptsQuery, ListCrawlJobsQuery, ListPurchasesQuery, ListWalletQuery } from "../rules/requests/admin-history.request";
import { toMeta } from "../utils/pagination";

export const adminHistoryService = {
  // Sổ cái ví của mọi người dùng: xem được vì sao số dư đổi
  async wallet(query: ListWalletQuery) {
    const { items, total } = await adminHistoryRepository.wallet(query);
    return { items, meta: toMeta(query, total) };
  },

  // Lịch sử lấy đề: ai lấy, đề nào, trạng thái, phí và lỗi (nếu có). Khách chưa đăng nhập không có user.
  async crawlJobs(query: ListCrawlJobsQuery) {
    const userIds = query.userId || query.search ? await adminHistoryRepository.matchUserIds(query.userId, query.search) : undefined;
    const { rows, total } = await adminHistoryRepository.crawlJobs(query, userIds);
    const ids = [...new Set(rows.map((r) => r.userId).filter((v): v is number => v != null))];
    const byId = new Map((await adminHistoryRepository.usersByIds(ids)).map((u) => [u.id, u]));
    return {
      items: rows.map(({ guestId, userId, ...r }) => ({ ...r, guest: guestId !== null && userId === null, user: userId ? (byId.get(userId) ?? null) : null })),
      meta: toMeta(query, total),
    };
  },

  async attempts(query: ListAttemptsQuery) {
    const { items, total } = await adminHistoryRepository.attempts(query);
    return { items, meta: toMeta(query, total) };
  },

  async peDownloads(query: ListPurchasesQuery) {
    const { items, total } = await adminHistoryRepository.peDownloads(query);
    return { items, meta: toMeta(query, total) };
  },

  async explanationUnlocks(query: ListPurchasesQuery) {
    const { items, total } = await adminHistoryRepository.explanationUnlocks(query);
    return { items, meta: toMeta(query, total) };
  },

  async explanationPurchases(query: ListPurchasesQuery) {
    const { items, total } = await adminHistoryRepository.explanationPurchases(query);
    return { items, meta: toMeta(query, total) };
  },
};
