import type {
  AccountSettings,
  AdsSettings,
  LinkRewardAdmin,
  SubjectIssue,
  PromoSettings,
  AdminAttempt,
  AdminCrawlJob,
  AdminWalletTx,
  CrawlJobStatus,
  TransactionType,
  BankTransaction,
  BankTxStatus,
  AdminExam,
  AnswerSource,
  AdminReferral,
  AiAdminConfig,
  AnswerReportAdmin,
  GiftCode,
  ReferralSettings,
  ReferralSummary,
  ReportStatus,
  GiftCodeRedemption,
  AiEffort,
  CrawlerAdminConfig,
  DashboardOverview,
  DepositOrder,
  DepositStatus,
  Role,
  SepayAdminConfig,
  SyncResult,
  User,
  UserStatus,
} from "@/shared/types/api";
import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export interface GiftCodeForm {
  code?: string; // bỏ trống = hệ thống tự sinh
  amount: number;
  maxUses: number;
  expiresAt?: string; // ISO, bỏ trống = không hết hạn
  note?: string;
}

export interface UserFilter {
  page: number;
  search?: string;
  role?: Role | "";
  status?: UserStatus | "";
}

export interface SepayForm {
  apiToken?: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  codePrefix: string;
  minDeposit: number;
  orderExpireMinutes: number;
  cronEnabled: boolean;
  cronExpression: string;
}

export interface CrawlerForm {
  cookie?: string;
  loginEmail: string;
  loginPassword?: string;
  userAgent: string;
  referer: string;
  requestDelayMs: number;
  concurrency: number;
  webpQuality: number;
  fetchPrice: number;
}

export interface AiForm {
  enabled: boolean;
  useSearch: boolean;
  claudeModel: string;
  effort: AiEffort;
  explainPrice: number;
  anthropicApiKey?: string;
}

export interface ChatbotAdmin {
  settings: {
    enabled: boolean;
    claudeModel: string;
    hasGeminiKey: boolean;
    geminiKeyPreview: string;
  };
  knowledge: { chunks: number; embedded: number; model: string };
  stats: { today: number; total: number; unmatched: { question: string; createdAt: string }[] };
  cache: { entries: number; today: number; total: number }; // câu trả lời lưu sẵn; today/total = số lượt hỏi đã trả lời từ cache (không tốn token)
}

export interface ChatbotForm {
  enabled: boolean;
  claudeModel: string;
  geminiApiKey?: string;
}

export interface UserSummary {
  attempts: number;
  exams: number;
  deposits: number;
  depositTotal: number;
  activeSessions: number;
  lastAttemptAt: string | null;
  referrals: number;
}

export interface ExamQuestionAdmin {
  number: number;
  name: string;
  imageUrl: string;
  mediaUrl: string | null;
  answer: string;
  isReference: boolean;
}

// Gợi ý của AI khi giải lại một câu (chưa ghi DB)
export interface QuestionResolve {
  number: number;
  answer: string; // ví dụ "C" hoặc "A C"; rỗng nếu không có
  notQuestion: boolean; // AI cho rằng ảnh này không phải câu hỏi
  report: string;
  commentsRefreshed?: boolean; // đã lấy lại bình luận của câu này từ FuOverflow trước khi giải
  commentsCount?: number | null; // số bình luận lấy được
  commentsNote?: string | null; // lý do không lấy lại được (vẫn giải bằng bình luận đã lưu)
}

export interface ExamAdminDetail {
  id: number;
  title: string;
  threadId: string;
  sourceUrl: string;
  totalQuestions: number;
  answerSource: AnswerSource;
  aiReport: string | null;
  createdAt: string;
  solving: boolean;
  usage: { userExams: number; attempts: number; unlocks: number; purchases: number };
  questions: ExamQuestionAdmin[];
}

export interface PurchaseUser {
  id: number;
  email: string;
  fullName: string;
}

export interface AdminPeDownload {
  id: number;
  threadId: string;
  title: string;
  price: number;
  files: number;
  sizeBytes: number;
  status: "PENDING" | "DONE" | "FAILED";
  error: string | null;
  createdAt: string;
  user: PurchaseUser;
}

export interface AdminExplanationUnlock {
  id: number;
  price: number;
  questions: number;
  createdAt: string;
  user: PurchaseUser;
  exam: { id: number; title: string };
}

export interface AdminExplanationPurchase {
  id: number;
  questionNumber: number;
  price: number;
  isTrial: boolean;
  createdAt: string;
  user: PurchaseUser;
  exam: { id: number; title: string };
}

export interface QuestionChange {
  number: number;
  answer?: string;
  isReference?: boolean;
}

export const adminApi = {
  dashboard: () => http.get<DashboardOverview>("/admin/dashboard"),

  users: (f: UserFilter) => http.list<User>("/admin/users", { ...f, limit: PAGE_SIZE }),
  updateUser: (id: number, body: Partial<Pick<User, "fullName" | "role" | "status">> & { emailVerified?: boolean }) =>
    http.patch<User>(`/admin/users/${id}`, body),
  adjustBalance: (id: number, body: { amount: number; note: string }) =>
    http.post<User>(`/admin/users/${id}/balance`, body),

  user: (id: number) => http.get<User>(`/admin/users/${id}`),
  chatbot: () => http.get<ChatbotAdmin>("/admin/settings/chat"),
  saveChatbot: (body: ChatbotForm) => http.put<ChatbotAdmin["settings"]>("/admin/settings/chat", body),
  clearChatbotCache: () => http.delete("/admin/settings/chat/cache"),
  reindexChatbot: () => http.post<{ total: number; updated: number; embedded: number; warning?: string }>("/admin/settings/chat/reindex"),
  userSummary: (id: number) => http.get<UserSummary>(`/admin/users/${id}/summary`),
  resetUserPassword: (id: number, password?: string) => http.post<{ password: string }>(`/admin/users/${id}/reset-password`, password ? { password } : {}),
  sendResetLink: (id: number) => http.post<null>(`/admin/users/${id}/send-reset-link`),
  revokeUserSessions: (id: number) => http.post<null>(`/admin/users/${id}/revoke-sessions`),
  impersonateUser: (id: number) => http.post<{ token: string; user: User }>(`/admin/users/${id}/impersonate`),

  walletTransactions: (f: { page: number; userId?: string; search?: string; type?: TransactionType | "" }) =>
    http.list<AdminWalletTx>("/admin/wallet-transactions", { ...f, limit: PAGE_SIZE }),
  crawlJobs: (f: { page: number; userId?: string; search?: string; status?: CrawlJobStatus | "" }) =>
    http.list<AdminCrawlJob>("/admin/crawl-jobs", { ...f, limit: PAGE_SIZE }),
  attempts: (f: { page: number; userId?: string; search?: string; mode?: "PRACTICE" | "EXAM" | "" }) =>
    http.list<AdminAttempt>("/admin/attempts", { ...f, limit: PAGE_SIZE }),
  promoSettings: () => http.get<PromoSettings>("/admin/settings/promo"),
  savePromoSettings: (body: PromoSettings) => http.put<PromoSettings>("/admin/settings/promo", body),
  accountSettings: () => http.get<AccountSettings>("/admin/settings/account"),
  saveAccountSettings: (body: AccountSettings) => http.put<AccountSettings>("/admin/settings/account", body),
  adsSettings: () => http.get<AdsSettings>("/admin/settings/ads"),
  saveAdsSettings: (body: AdsSettings) => http.put<AdsSettings>("/admin/settings/ads", body),
  subjectIssues: () => http.get<SubjectIssue[]>("/admin/subject-issues"),
  resolveSubjectIssue: (id: number) => http.delete(`/admin/subject-issues/${id}`),
  linkRewardSettings: () => http.get<LinkRewardAdmin>("/admin/settings/link-reward"),
  saveLinkRewardSettings: (body: {
    enabled: boolean;
    link4mEnabled: boolean;
    link4mTurns: number;
    apiToken?: string;
    dailyLimit: number;
    shrinkmeEnabled: boolean;
    shrinkmeTurns: number;
    shrinkmeToken?: string;
    shrinkmeDailyLimit: number;
    validDays: number;
    minSeconds: number;
  }) =>
    http.put<LinkRewardAdmin>("/admin/settings/link-reward", body),

  giftCodes: (page: number, filter: { q?: string; active?: "true" | "false" | "" }) =>
    http.list<GiftCode>("/admin/gift-codes", { page, limit: PAGE_SIZE, ...filter }),
  createGiftCode: (body: GiftCodeForm) => http.post<GiftCode>("/admin/gift-codes", body),
  setGiftCodeActive: (id: number, active: boolean) => http.patch<GiftCode>(`/admin/gift-codes/${id}`, { active }),
  giftCodeRedemptions: (id: number, page: number) =>
    http.list<GiftCodeRedemption>(`/admin/gift-codes/${id}/redemptions`, { page, limit: PAGE_SIZE }),

  answerReports: (page: number, status: ReportStatus | "") =>
    http.list<AnswerReportAdmin>("/admin/answer-reports", { page, limit: PAGE_SIZE, status }),
  approveReport: (id: number, body: { note?: string }) => http.post<unknown>(`/admin/answer-reports/${id}/approve`, body),
  rejectReport: (id: number, body: { note?: string }) => http.post<unknown>(`/admin/answer-reports/${id}/reject`, body),

  referralSettings: () => http.get<ReferralSettings>("/admin/settings/referral"),
  saveReferralSettings: (body: ReferralSettings) => http.put<ReferralSettings>("/admin/settings/referral", body),
  referralSummary: () => http.get<ReferralSummary>("/admin/referrals/summary"),
  referrals: (page: number) => http.list<AdminReferral>("/admin/referrals", { page, limit: PAGE_SIZE }),

  deposits: (page: number, status?: DepositStatus | "", userId?: string) =>
    http.list<DepositOrder>("/admin/deposits", { page, limit: PAGE_SIZE, status, userId }),
  bankTransactions: (page: number, status?: BankTxStatus | "") =>
    http.list<BankTransaction>("/admin/bank-transactions", { page, limit: PAGE_SIZE, status }),

  sepayConfig: () => http.get<SepayAdminConfig>("/admin/settings/sepay"),
  saveSepayConfig: (body: SepayForm) => http.put<SepayAdminConfig>("/admin/settings/sepay", body),
  crawlerConfig: () => http.get<CrawlerAdminConfig>("/admin/settings/crawler"),
  saveCrawlerConfig: (body: CrawlerForm) => http.put<CrawlerAdminConfig>("/admin/settings/crawler", body),
  // Đăng nhập FuOverflow bằng tài khoản đã lưu để lấy cookie mới
  crawlerLogin: () => http.post<CrawlerAdminConfig>("/admin/settings/crawler/login"),
  aiConfig: () => http.get<AiAdminConfig>("/admin/settings/ai"),
  saveAiConfig: (body: AiForm) => http.put<AiAdminConfig>("/admin/settings/ai", body),
  exams: (page: number) => http.list<AdminExam>("/admin/exams", { page, limit: PAGE_SIZE }),
  renameExam: (id: number, title: string) => http.patch<ExamAdminDetail>(`/admin/exams/${id}`, { title }),
  deleteExam: (id: number) => http.delete(`/admin/exams/${id}`),
  peDownloads: (f: { page: number; userId?: string; search?: string }) => http.list<AdminPeDownload>("/admin/pe-downloads", { ...f, limit: PAGE_SIZE }),
  explanationUnlocks: (f: { page: number; userId?: string; search?: string }) => http.list<AdminExplanationUnlock>("/admin/explanation-unlocks", { ...f, limit: PAGE_SIZE }),
  explanationPurchases: (f: { page: number; userId?: string; search?: string }) => http.list<AdminExplanationPurchase>("/admin/explanation-purchases", { ...f, limit: PAGE_SIZE }),
  examDetail: (id: number) => http.get<ExamAdminDetail>(`/admin/exams/${id}`),
  resolveQuestion: (id: number, number: number) => http.post<QuestionResolve>(`/admin/exams/${id}/questions/${number}/resolve`),
  saveExamQuestions: (id: number, changes: QuestionChange[]) => http.patch<ExamAdminDetail>(`/admin/exams/${id}/questions`, { changes }),
  solveExam: (id: number) => http.post<null>(`/admin/exams/${id}/solve`),
  examReport: (id: number) => http.get<{ id: number; title: string; aiReport: string | null }>(`/admin/exams/${id}/report`),
  sepayStatus: () => http.get<SyncResult | null>("/admin/sepay/status"),
  syncNow: () => http.post<SyncResult>("/admin/sepay/sync"),
};
