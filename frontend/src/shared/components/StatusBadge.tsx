import { Badge, type Tone } from "@/shared/ui/Badge";
import type { BankTxStatus, DepositStatus, GiftCodeStatus, ReportStatus, Role, TransactionType, UserStatus } from "@/shared/types/api";

// Gom nhãn + màu của mọi trạng thái vào một chỗ để panel user và admin hiển thị giống nhau
const DEPOSIT: Record<DepositStatus, [string, Tone]> = {
  PENDING: ["Chờ thanh toán", "warning"],
  PAID: ["Đã thanh toán", "success"],
  EXPIRED: ["Hết hạn", "neutral"],
};
const USER: Record<UserStatus, [string, Tone]> = {
  ACTIVE: ["Hoạt động", "success"],
  BANNED: ["Bị khoá", "danger"],
};
const ROLE: Record<Role, [string, Tone]> = {
  ADMIN: ["Quản trị", "info"],
  USER: ["Thành viên", "neutral"],
};
const GIFT: Record<GiftCodeStatus, [string, Tone]> = {
  ACTIVE: ["Đang dùng được", "success"],
  DISABLED: ["Đã tắt", "neutral"],
  EXPIRED: ["Hết hạn", "warning"],
  USED_UP: ["Hết lượt", "warning"],
};
const REPORT: Record<ReportStatus, [string, Tone]> = {
  PENDING: ["Chờ duyệt", "warning"],
  APPROVED: ["Đã xác nhận", "success"],
  REJECTED: ["Từ chối", "neutral"],
};
const BANK: Record<BankTxStatus, [string, Tone]> = {
  MATCHED: ["Đã khớp", "success"],
  UNMATCHED: ["Chưa khớp", "warning"],
};

export const TRANSACTION_LABEL: Record<TransactionType, string> = {
  DEPOSIT: "Nạp credit",
  GIFT_CODE: "Nhập giftcode",
  REPORT_REWARD: "Thưởng báo cáo đáp án",
  ADMIN_ADJUST: "Điều chỉnh bởi quản trị",
  CRAWL_CHARGE: "Phí lấy đề FuOverflow",
  CRAWL_REFUND: "Hoàn phí lấy đề",
};

const make =
  <K extends string>(map: Record<K, [string, Tone]>) =>
  ({ value }: { value: K }) => (
    <Badge tone={map[value][1]}>{map[value][0]}</Badge>
  );

export const DepositStatusBadge = make(DEPOSIT);
export const UserStatusBadge = make(USER);
export const RoleBadge = make(ROLE);
export const BankTxBadge = make(BANK);
export const GiftCodeStatusBadge = make(GIFT);
export const ReportStatusBadge = make(REPORT);

