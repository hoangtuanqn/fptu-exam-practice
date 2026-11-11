// Thông báo cho admin về hành vi của người dùng. Mỗi loại sự kiện (kind) khai báo một lần ở đây:
// nhóm để lọc, mức độ (màu/biểu tượng) và có "quan trọng" không (quan trọng thì lên mục riêng, admin cần nắm).
// Muốn báo thêm một hành vi: thêm một dòng vào bảng này rồi gọi adminNoticeService.push("<kind>", {...}) ở nơi hành vi xảy ra.
export const NOTICE_LEVELS = ["info", "success", "warning", "error"] as const;
export type NoticeLevel = (typeof NOTICE_LEVELS)[number];

export const NOTICE_CATEGORIES = {
  account: "Tài khoản",
  fetch: "Lấy đề",
  money: "Nạp tiền & gói",
  exam: "Đề & AI",
  system: "Hệ thống",
} as const;
export type NoticeCategory = keyof typeof NOTICE_CATEGORIES;

interface KindSpec {
  category: NoticeCategory;
  level: NoticeLevel;
  important: boolean;
}

export const NOTICE_KINDS = {
  "user.registered": { category: "account", level: "info", important: false },
  "gift.redeemed": { category: "money", level: "info", important: false },
  "deposit.success": { category: "money", level: "success", important: true },
  "plan.purchased": { category: "money", level: "success", important: true },
  "fetch.done": { category: "fetch", level: "success", important: false },
  "fetch.failed": { category: "fetch", level: "error", important: true },
  "pe.done": { category: "fetch", level: "success", important: false },
  "pe.failed": { category: "fetch", level: "error", important: true },
  "report.created": { category: "exam", level: "warning", important: true },
  "ai.failed": { category: "exam", level: "error", important: true },
  "attempt.finished": { category: "exam", level: "info", important: false },
  "system.error": { category: "system", level: "error", important: true },
} as const satisfies Record<string, KindSpec>;

export type NoticeKind = keyof typeof NOTICE_KINDS;

// Cùng một lỗi lặp lại trong khoảng này chỉ báo một lần (tránh một sự cố làm ngập danh sách)
export const NOTICE_DEDUPE_MS = 5 * 60_000;
// Thông báo đã đọc giữ ngần này ngày; chưa đọc giữ lâu hơn
export const NOTICE_KEEP_READ_DAYS = 30;
export const NOTICE_KEEP_ALL_DAYS = 90;
