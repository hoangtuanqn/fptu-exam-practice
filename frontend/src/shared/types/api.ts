// Kiểu dữ liệu trả về từ backend (khớp với backend/src)

export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BANNED";
export type DepositStatus = "PENDING" | "PAID" | "EXPIRED";
export type BankTxStatus = "MATCHED" | "UNMATCHED";
export type TransactionType = "DEPOSIT" | "ADMIN_ADJUST";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  balance: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: number;
  type: TransactionType;
  amount: number; // âm = trừ tiền
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

export interface DepositOrder {
  id: number;
  code: string;
  amount: number;
  status: DepositStatus;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  user?: Pick<User, "id" | "email" | "fullName">;
}

export interface DepositPayment {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  content: string;
  qrUrl: string;
}

export interface DepositInfo {
  minDeposit: number;
  orderExpireMinutes: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface BankTransaction {
  id: number;
  sepayId: string;
  gateway: string | null;
  content: string;
  amountIn: number;
  transactionAt: string;
  status: BankTxStatus;
  depositOrderId: number | null;
}

export interface SepayAdminConfig {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  codePrefix: string;
  minDeposit: number;
  orderExpireMinutes: number;
  cronEnabled: boolean;
  cronExpression: string;
  hasApiToken: boolean;
  apiTokenPreview: string;
}

export interface CrawlerAdminConfig {
  userAgent: string;
  referer: string;
  requestDelayMs: number;
  webpQuality: number;
  hasCookie: boolean;
  cookiePreview: string;
}

export interface SyncResult {
  at: string;
  ok: boolean;
  message: string;
  fetched: number;
  created: number;
  matched: number;
}

export interface DashboardOverview {
  users: { active: number; banned: number };
  deposits: {
    pending: number;
    paid: number;
    expired: number;
    totalDeposited: number;
    todayDeposited: number;
    unmatchedTransactions: number;
  };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}
