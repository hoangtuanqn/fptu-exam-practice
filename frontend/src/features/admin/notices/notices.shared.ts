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
import { formatDateTime } from "@/shared/utils/formatters";

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
  { icon: LucideIcon; color: string; label: string }
> = {
  info: { icon: Info, color: "text-primary", label: "Thông tin" },
  success: { icon: CheckCircle2, color: "text-success", label: "Thành công" },
  warning: { icon: AlertTriangle, color: "text-warning", label: "Cảnh báo" },
  error: { icon: CircleAlert, color: "text-error", label: "Lỗi" },
};

// "Vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước"; quá một tuần thì hiện ngày giờ đầy đủ
export function timeAgo(iso: string, now = Date.now()) {
  const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "Vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)} giờ trước`;
  if (sec < 7 * 86_400) return `${Math.floor(sec / 86_400)} ngày trước`;
  return formatDateTime(iso);
}
