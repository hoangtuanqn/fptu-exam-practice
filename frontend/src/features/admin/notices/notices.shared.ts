import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  type LucideIcon,
} from "lucide-react";
import type {
  AdminNotice,
  NoticeCategory,
} from "@/features/admin/api/admin.api";

// Nhãn nhóm và kiểu hiển thị theo mức độ, dùng chung cho trang Thông báo và danh sách xổ ra từ chuông
export const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  account: "Tài khoản",
  fetch: "Lấy đề",
  money: "Nạp tiền & gói",
  exam: "Đề & AI",
  system: "Hệ thống",
};

export const LEVEL: Record<
  AdminNotice["level"],
  { icon: LucideIcon; color: string }
> = {
  info: { icon: Info, color: "text-primary" },
  success: { icon: CheckCircle2, color: "text-success" },
  warning: { icon: AlertTriangle, color: "text-warning" },
  error: { icon: CircleAlert, color: "text-error" },
};
