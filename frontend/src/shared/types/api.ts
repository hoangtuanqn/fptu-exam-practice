// Kiểu dữ liệu trả về từ backend (khớp với backend/src)

export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BANNED";
export type DepositStatus = "PENDING" | "PAID" | "EXPIRED";
export type BankTxStatus = "MATCHED" | "UNMATCHED";
export type TransactionType = "DEPOSIT" | "ADMIN_ADJUST" | "CRAWL_CHARGE" | "CRAWL_REFUND" | "GIFT_CODE" | "REPORT_REWARD" | "EXPLAIN_CHARGE" | "EXPLAIN_REFUND" | "REFERRAL_BONUS" | "REFERRAL_COMMISSION" | "SIGNUP_BONUS";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  balance: number;
  emailVerifiedAt: string | null; // chưa xác minh thì chưa dùng được các dịch vụ trừ credit
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

// ----- Giới thiệu thành viên
export interface ReferralSettings {
  enabled: boolean;
  signupBonus: number; // credit người mới nhận khi đăng ký qua mã
  referrerSignupBonus: number; // credit người giới thiệu nhận khi có người đăng ký
  claimWindowDays: number; // số ngày sau đăng ký còn nhập được mã giới thiệu
  commissionPercent: number; // % số tiền người được giới thiệu nạp
}

export interface ReferralSummary {
  referred: number;
  signupBonusPaid: number;
  commissionPaid: number;
}

// Một cặp người giới thiệu - người được giới thiệu (admin xem)
export interface AdminReferral {
  id: number;
  fullName: string;
  email: string;
  joinedAt: string;
  referrer: { id: number; fullName: string; email: string } | null;
  earned: number; // tổng credit người giới thiệu đã nhận từ người này
}

// Người mà một thành viên đã giới thiệu (email đã che bớt)
export interface ReferredMember {
  id: number;
  name: string;
  email: string;
  joinedAt: string;
  earned: number;
}

export interface ReferralOverview {
  code: string;
  program: { enabled: boolean; signupBonus: number; commissionPercent: number };
  // Nhập mã giới thiệu sau khi đăng ký: open = còn nhập được, referred = đã có người giới thiệu, expired = quá hạn
  claim: { status: "open" | "referred" | "expired" | "unavailable"; deadline: string | null };
  stats: { referred: number; earned: number };
  items: ReferredMember[];
  meta: PageMeta;
}

// ----- Lịch sử cho quản trị
type UserRef = Pick<User, "id" | "email" | "fullName">;

export interface AdminWalletTx extends WalletTransaction {
  user: UserRef;
}

export type CrawlJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export interface AdminCrawlJob {
  id: number;
  threadId: string;
  status: CrawlJobStatus;
  stage: string | null;
  error: string | null;
  chargedAmount: number;
  createdAt: string;
  finishedAt: string | null;
  guest: boolean; // khách chưa đăng nhập
  user: UserRef | null;
  exam: { id: number; title: string } | null;
}

export interface AdminAttempt {
  id: number;
  mode: "PRACTICE" | "EXAM";
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  totalGraded: number;
  durationSec: number;
  createdAt: string;
  user: UserRef;
  exam: { id: number; title: string };
}

export interface AccountSettings {
  signupCredit: number; // credit tặng mọi tài khoản mới khi đăng ký
}
