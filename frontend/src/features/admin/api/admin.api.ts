import type {
  BankTransaction,
  BankTxStatus,
  AdminExam,
  AiAdminConfig,
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
  provider: "gemini" | "aimlapi";
  model: string;
  aimlModel: string;
  apiKey?: string;
  aimlApiKey?: string;
}

export const adminApi = {
  dashboard: () => http.get<DashboardOverview>("/admin/dashboard"),

  users: (f: UserFilter) => http.list<User>("/admin/users", { ...f, limit: 15 }),
  updateUser: (id: number, body: Partial<Pick<User, "fullName" | "role" | "status">>) =>
    http.patch<User>(`/admin/users/${id}`, body),
  adjustBalance: (id: number, body: { amount: number; note: string }) =>
    http.post<User>(`/admin/users/${id}/balance`, body),

  deposits: (page: number, status?: DepositStatus | "") =>
    http.list<DepositOrder>("/admin/deposits", { page, limit: 15, status }),
  bankTransactions: (page: number, status?: BankTxStatus | "") =>
    http.list<BankTransaction>("/admin/bank-transactions", { page, limit: 15, status }),

  sepayConfig: () => http.get<SepayAdminConfig>("/admin/settings/sepay"),
  saveSepayConfig: (body: SepayForm) => http.put<SepayAdminConfig>("/admin/settings/sepay", body),
  crawlerConfig: () => http.get<CrawlerAdminConfig>("/admin/settings/crawler"),
  saveCrawlerConfig: (body: CrawlerForm) => http.put<CrawlerAdminConfig>("/admin/settings/crawler", body),
  aiConfig: () => http.get<AiAdminConfig>("/admin/settings/ai"),
  saveAiConfig: (body: AiForm) => http.put<AiAdminConfig>("/admin/settings/ai", body),
  exams: (page: number) => http.list<AdminExam>("/admin/exams", { page, limit: 15 }),
  solveExam: (id: number) => http.post<null>(`/admin/exams/${id}/solve`),
  examReport: (id: number) => http.get<{ id: number; title: string; aiReport: string | null }>(`/admin/exams/${id}/report`),
  sepayStatus: () => http.get<SyncResult | null>("/admin/sepay/status"),
  syncNow: () => http.post<SyncResult>("/admin/sepay/sync"),
};
