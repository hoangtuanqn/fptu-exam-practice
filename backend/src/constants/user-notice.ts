// Chuông thông báo của người dùng (biến động số dư, thông báo hệ thống)
export const USER_NOTICE_LEVELS = ["info", "success", "warning"] as const;
export type UserNoticeLevel = (typeof USER_NOTICE_LEVELS)[number];

export const USER_NOTICE_TITLE_MAX = 200;
export const USER_NOTICE_BODY_MAX = 500;
export const USER_NOTICE_LINK_MAX = 200;
// Số id tối đa mỗi lần đánh dấu đã đọc
export const USER_NOTICE_READ_MAX_IDS = 50;
// Gửi thông báo hệ thống cho mọi thành viên: ghi theo từng lô
export const USER_NOTICE_BROADCAST_BATCH = 1000;
// Thông báo đã đọc giữ ngần này ngày rồi bị dọn
export const USER_NOTICE_KEEP_READ_DAYS = 90;
// Thông báo chưa đọc giữ lâu hơn rồi cũng bị dọn (người không bao giờ mở chuông)
export const USER_NOTICE_KEEP_UNREAD_DAYS = 180;
export const USER_NOTICE_CLEANUP_BATCH = 5000;
// Thông báo ghi trong transaction: chờ transaction xong rồi mới đẩy realtime (kiểm tra lại sau các mốc này)
export const USER_NOTICE_PUSH_CHECK_MS = [500, 2_000, 8_000] as const;

// Trang lịch sử giao dịch ở giao diện
export const WALLET_NOTICE_LINK = "/account/transactions";
