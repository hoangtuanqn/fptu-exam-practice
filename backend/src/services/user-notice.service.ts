import { Prisma, type TransactionType } from "@prisma/client";
import {
  USER_NOTICE_BROADCAST_BATCH,
  USER_NOTICE_CLEANUP_BATCH,
  USER_NOTICE_KEEP_READ_DAYS,
  USER_NOTICE_KEEP_UNREAD_DAYS,
  USER_NOTICE_PUSH_CHECK_MS,
} from "../constants/user-notice";
import { realtimeHub } from "../realtime/hub";
import { userNoticeRepository, type UserNoticeRow } from "../repositories/user-notice.repository";
import type { Db } from "../repositories/wallet.repository";
import type { SystemNoticeBody } from "../rules/requests/user-notice.request";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { walletNotice } from "../utils/user-notice";

const DAY_MS = 24 * 60 * 60_000;
// Lỗi Prisma khiến cả transaction phải huỷ: deadlock/xung đột ghi, transaction đã đóng/hết giờ, mất kết nối
const TX_FATAL_CODES = new Set(["P2034", "P2028", "P1001", "P1008", "P1017"]);

// Đẩy realtime chỉ sau khi dòng đã commit: ghi trong transaction thì đợi rồi đọc lại bằng kết nối khác,
// thấy dòng là transaction đã xong; transaction bị huỷ thì không bao giờ thấy và không đẩy gì.
// shortcut: transaction chạy lâu hơn mốc cuối thì không đẩy (giao diện vẫn thấy khi tải lại số chưa đọc).
function pushAfterCommit(db: Db, userId: string, row: UserNoticeRow) {
  if (!realtimeHub.hasUser(userId)) return;
  if ("$transaction" in db) return realtimeHub.publishUserNotice(userId, row); // client gốc: đã commit
  const check = (i: number) =>
    setTimeout(async () => {
      const committed = await userNoticeRepository.findCommitted(row.id).catch(() => null);
      if (committed) realtimeHub.publishUserNotice(userId, committed);
      else if (i + 1 < USER_NOTICE_PUSH_CHECK_MS.length) check(i + 1);
    }, USER_NOTICE_PUSH_CHECK_MS[i]).unref();
  check(0);
}

export const userNoticeService = {
  /** Ghi thông báo cho một dòng sổ cái ví, trong cùng transaction với dòng đó. Số tiền 0 thì không báo. */
  async fromLedger(db: Db, entry: { userId: string; type: TransactionType; amount: number; balanceAfter: number; note?: string | null }) {
    if (entry.amount === 0) return null;
    // Thông báo chỉ là phụ: ghi lỗi thì bỏ qua để không huỷ giao dịch tiền. Riêng lỗi làm hỏng cả transaction
    // (deadlock/chờ khoá/transaction đã đóng, mất kết nối) thì ném lại để bên gọi thử lại hoặc báo lỗi như cũ.
    try {
      const row = await userNoticeRepository.create(db, entry.userId, walletNotice(entry));
      pushAfterCommit(db, entry.userId, row);
      return row;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && TX_FATAL_CODES.has(err.code)) throw err;
      console.error("[user-notice] không ghi được thông báo ví", entry.userId, entry.type, (err as Error).message);
      return null;
    }
  },

  async list(userId: string, query: PaginationQuery) {
    const { items, total } = await userNoticeRepository.listByUser(userId, query);
    return { items, meta: toMeta(query, total) };
  },

  async unreadCount(userId: string) {
    return { unread: await userNoticeRepository.countUnread(userId) };
  },

  /** Đánh dấu đã đọc (chỉ thông báo của chính người này). Không truyền ids = tất cả. */
  async markRead(userId: string, ids?: string[]) {
    return { updated: await userNoticeRepository.markRead(userId, ids) };
  },

  /**
   * Thông báo hệ thống cho mọi thành viên đang hoạt động, ghi theo lô (không gói một transaction lớn).
   * Gửi lại cùng `key` (ví dụ sau khi lần trước đứt giữa chừng) chỉ ghi cho người còn thiếu; `sent` = số ghi thêm lần này.
   */
  async broadcast(input: SystemNoticeBody) {
    const data = { kind: "system", level: input.level, title: input.title, body: input.body ?? null, link: input.link ?? null };
    let sent = 0;
    let after: string | null = null;
    for (;;) {
      const ids = await userNoticeRepository.activeUserIds(after, USER_NOTICE_BROADCAST_BATCH);
      if (ids.length) sent += await userNoticeRepository.createForUsers(ids, data, input.key);
      if (ids.length < USER_NOTICE_BROADCAST_BATCH) break;
      after = ids[ids.length - 1]!;
    }
    if (sent > 0) realtimeHub.publishUserNoticeSync(); // các dòng đã commit: thành viên đang mở trang tải lại chuông
    return { sent };
  },

  /** Dọn thông báo đã đọc quá hạn và thông báo chưa đọc quá cũ (cron hằng đêm). */
  async cleanup() {
    const now = Date.now();
    const read = await userNoticeRepository.deleteReadBefore(new Date(now - USER_NOTICE_KEEP_READ_DAYS * DAY_MS), USER_NOTICE_CLEANUP_BATCH);
    const unread = await userNoticeRepository.deleteUnreadBefore(new Date(now - USER_NOTICE_KEEP_UNREAD_DAYS * DAY_MS), USER_NOTICE_CLEANUP_BATCH);
    return { read, unread };
  },
};
