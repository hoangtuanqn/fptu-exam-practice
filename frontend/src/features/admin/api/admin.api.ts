import type {
  BankTransaction,
  BankTxStatus,
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
  sepayStatus: () => http.get<SyncResult | null>("/admin/sepay/status"),
  syncNow: () => http.post<SyncResult>("/admin/sepay/sync"),
};
