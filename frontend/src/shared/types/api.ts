// Kiểu dữ liệu trả về từ backend (khớp với backend/src)

export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BANNED";
export type DepositStatus = "PENDING" | "PAID" | "EXPIRED";
export type BankTxStatus = "MATCHED" | "UNMATCHED";
export type TransactionType = "DEPOSIT" | "ADMIN_ADJUST" | "CRAWL_CHARGE" | "CRAWL_REFUND" | "GIFT_CODE" | "REPORT_REWARD" | "EXPLAIN_CHARGE" | "EXPLAIN_REFUND";

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
  amount: number; // âm = trừ credit
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
  fetchPrice: number;
  hasCookie: boolean;
  cookiePreview: string;
}

export type AiEffort = "low" | "medium" | "high" | "xhigh" | "max";

export interface AiAdminConfig {
  enabled: boolean;
  claudeModel: string;
  effort: AiEffort;
  explainPrice: number; // phí (credit) mỗi lần xem lời giải thích AI
  useSearch: boolean;
  hasApiKey: boolean;
  apiKeyPreview: string;
}

export type AnswerSource = "PENDING" | "FAILED" | "DEFAULT" | "AI" | "MANUAL";

export interface AdminExam {
  id: number;
  title: string;
  threadId: string;
  totalQuestions: number;
  answerSource: AnswerSource;
  createdAt: string;
  solving: boolean; // AI đang giải lại
  solveError: string | null; // lần giải lại gần nhất bị lỗi
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

// ----- Giftcode
export type GiftCodeStatus = "ACTIVE" | "DISABLED" | "EXPIRED" | "USED_UP";

export interface GiftCode {
  id: number;
  code: string;
  amount: number; // credit mỗi lượt
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
  createdAt: string;
  status: GiftCodeStatus;
}

// Một lượt dùng mã (admin xem ai đã dùng)
export interface GiftCodeRedemption {
  id: number;
  amount: number;
  createdAt: string;
  user: { id: number; email: string; fullName: string };
}

// Mã mà chính thành viên đã nhập
export interface MyGiftRedemption {
  id: number;
  code: string;
  amount: number;
  createdAt: string;
}

export interface RedeemResult {
  code: string;
  amount: number;
  balanceAfter: number;
}

// ----- Báo cáo đáp án
export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";

// Báo cáo trong danh sách của admin
export interface AnswerReportAdmin {
  id: number;
  examId: number;
  questionNumber: number;
  currentAnswer: string;
  proposedAnswer: string;
  reason: string;
  status: ReportStatus;
  reward: number;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  imageUrl: string | null;
  exam: { title: string; threadId: string };
  user: { id: number; email: string; fullName: string };
}

// Báo cáo của chính thành viên
export interface MyAnswerReport {
  id: number;
  questionNumber: number;
  proposedAnswer: string;
  status: ReportStatus;
  reward: number;
  reviewNote: string | null;
  createdAt: string;
  exam: { title: string; threadId: string };
}
