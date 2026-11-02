import { Badge, type Tone } from "../ui/Badge";
import type { BankTxStatus, DepositStatus, Role, TransactionType, UserStatus } from "../../types/api";

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
const BANK: Record<BankTxStatus, [string, Tone]> = {
  MATCHED: ["Đã khớp", "success"],
  UNMATCHED: ["Chưa khớp", "warning"],
};

export const TRANSACTION_LABEL: Record<TransactionType, string> = {
  DEPOSIT: "Nạp tiền",
  ADMIN_ADJUST: "Điều chỉnh bởi quản trị",
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
