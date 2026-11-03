import type {
  BankTransaction,
  BankTxStatus,
  AdminExam,
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
  userAgent: string;
  referer: string;
  requestDelayMs: number;
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

export const adminApi = {
  dashboard: () => http.get<DashboardOverview>("/admin/dashboard"),

  users: (f: UserFilter) => http.list<User>("/admin/users", { ...f, limit: PAGE_SIZE }),
  updateUser: (id: number, body: Partial<Pick<User, "fullName" | "role" | "status">>) =>
    http.patch<User>(`/admin/users/${id}`, body),
  adjustBalance: (id: number, body: { amount: number; note: string }) =>
    http.post<User>(`/admin/users/${id}/balance`, body),

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

  deposits: (page: number, status?: DepositStatus | "") =>
    http.list<DepositOrder>("/admin/deposits", { page, limit: PAGE_SIZE, status }),
  bankTransactions: (page: number, status?: BankTxStatus | "") =>
    http.list<BankTransaction>("/admin/bank-transactions", { page, limit: PAGE_SIZE, status }),

  sepayConfig: () => http.get<SepayAdminConfig>("/admin/settings/sepay"),
  saveSepayConfig: (body: SepayForm) => http.put<SepayAdminConfig>("/admin/settings/sepay", body),
  crawlerConfig: () => http.get<CrawlerAdminConfig>("/admin/settings/crawler"),
  saveCrawlerConfig: (body: CrawlerForm) => http.put<CrawlerAdminConfig>("/admin/settings/crawler", body),
  aiConfig: () => http.get<AiAdminConfig>("/admin/settings/ai"),
  saveAiConfig: (body: AiForm) => http.put<AiAdminConfig>("/admin/settings/ai", body),
  exams: (page: number) => http.list<AdminExam>("/admin/exams", { page, limit: PAGE_SIZE }),
  solveExam: (id: number) => http.post<null>(`/admin/exams/${id}/solve`),
  examReport: (id: number) => http.get<{ id: number; title: string; aiReport: string | null }>(`/admin/exams/${id}/report`),
  sepayStatus: () => http.get<SyncResult | null>("/admin/sepay/status"),
  syncNow: () => http.post<SyncResult>("/admin/sepay/sync"),
};
