import type { NoticeCategory } from "@/features/admin/api/admin.api";

// Nhãn nhóm thông báo quản trị. Kiểu hiển thị theo mức độ và thời gian tương đối ở shared/ui/NotificationBell.
export const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  account: "Tài khoản",
  fetch: "Lấy đề",
  money: "Nạp tiền & gói",
  exam: "Đề & AI",
  system: "Hệ thống",
};
