import type {
  AccountSettings,
  CrawlerSettings,
  LinkRewardAdmin,
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
  DashboardOverview,
  DepositOrder,
  DepositStatus,
  Role,
  SepayAdminConfig,
  SyncResult,
  User,
  UserStatus,
} from "@/shared/types/api";
import { ApiError, toApiError, BASE, http, tokenStore } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export type NoticeCategory = "account" | "fetch" | "money" | "exam" | "system";

export interface AdminNotice {
  id: string;
  kind: string;
  category: NoticeCategory;
  level: "info" | "success" | "warning" | "error";
  important: boolean;
  title: string;
  body: string | null;
  userId: string | null;
  link: string | null; // trang admin liên quan
  createdAt: string;
  readAt: string | null;
}

// Số việc admin cần xem: báo cáo đáp án chờ duyệt và đánh giá "chưa tốt", đều chưa giải quyết
export interface ReviewCounts {
  reports: number;
  feedback: number;
  contributions?: number; // máy chủ cũ chưa gửi
}

/** "true" | "false" lọc theo đã giải quyết, rỗng = tất cả */
export type ResolvedFilter = "true" | "false" | "";

export interface NoticeCounts {
  unread: number;
  importantUnread: number;
  categories: Record<NoticeCategory, number>; // số chưa đọc theo nhóm
}

export interface SubjectRow {
  code: string;
  name: string;
  semester: number | null;
  credits: number | null;
  minPassMark: number | null;
  chapters: { total: number; named: number; hasNames: boolean };
  inferredChapters: number; // số chương AI đã suy và lưu (0 = chưa suy)
  exams: number; // đề đang có trong hệ thống
}

export interface SubjectDetail {
  code: string;
  name: string;
  semester: number | null;
  credits: number | null;
  minPassMark: number | null;
  syllabusId: string | null;
  exams: number;
  chapters: { number: number; title: string; topics: string[] }[];
  inferred: {
    topics: { label: string; hint: string }[];
    model: string | null;
    at: string;
  } | null;
}

export interface SubjectPatch {
  name?: string;
  credits?: number | null;
  semester?: number | null;
}

export interface GiftCodeForm {
  code?: string; // bỏ trống = hệ thống tự sinh
  amount: number;
  maxUses: number;
  expiresAt?: string; // ISO, bỏ trống = không hết hạn
  note?: string;
  creditTtlMinutes?: number; // credit nhận được hết hạn sau chừng này phút kể từ lúc người dùng nhập; bỏ trống = vĩnh viễn
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

export interface AiForm {
  enabled: boolean;
  useSearch: boolean;
  claudeModel: string;
  effort: AiEffort;
  explainPrice: number;
  anthropicApiKey?: string;
}

export interface ExplanationFeedbackAdmin {
  id: string;
  examId: string;
  questionNumber: number;
  helpful: boolean;
  reason: string | null;
  comment: string | null;
  updatedAt: string;
  resolvedAt?: string | null; // có thể thiếu khi backend cũ
  resolvedById?: string | null;
  user: { fullName: string; email: string };
  exam: { title: string; threadId: string };
  explanation: string | null; // lời giải đang lưu (null nếu đã bị xóa)
  imageUrl?: string | null; // ảnh câu hỏi để đối chiếu; backend cũ không có
  model: string | null;
}

export interface ChatbotAdmin {
  settings: {
    enabled: boolean;
    claudeModel: string;
    hasOpenaiKey: boolean;
    openaiKeyPreview: string;
    // máy chủ cũ không trả các trường nguồn trả lời
    chatProvider?: ChatProvider;
    chatBaseUrl?: string;
    chatModel?: string;
    chatExtraHeader?: string;
    hasChatKey?: boolean;
    chatKeyPreview?: string;
  };
  knowledge: { chunks: number; embedded: number; model: string };
  stats: {
    today: number;
    total: number;
    unmatched: { question: string; createdAt: string }[];
    usage?: {
      calls7d: number;
      avgInput: number;
      avgCacheRead: number;
      avgOutput: number;
      truncated7d: number;
    }; // máy chủ cũ không trả
  };
  cache: { entries: number; today: number; total: number }; // câu trả lời lưu sẵn; today/total = số lượt hỏi đã trả lời từ cache (không tốn token)
}

export type ChatProvider = "anthropic" | "openai";

// Mọi trường đều tuỳ chọn: máy chủ chỉ cập nhật trường được gửi
export interface ChatbotForm {
  enabled?: boolean;
  claudeModel?: string;
  openaiApiKey?: string;
  chatProvider?: ChatProvider;
  chatBaseUrl?: string;
  chatModel?: string;
  chatApiKey?: string; // chỉ gửi khi admin nhập khoá mới
  clearChatKey?: boolean;
  chatExtraHeader?: string;
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
}

export interface ExamAdminDetail {
  id: string;
  title: string;
  threadId: string;
  totalQuestions: number;
  answerSource: AnswerSource;
  aiReport: string | null;
  createdAt: string;
  solving: boolean;
  usage: {
    userExams: number;
    attempts: number;
    unlocks: number;
    purchases: number;
  };
  questions: ExamQuestionAdmin[];
}

export interface PurchaseUser {
  id: string;
  email: string;
  fullName: string;
}

export interface AdminExplanationUnlock {
  id: number;
  price: number;
  questions: number;
  createdAt: string;
  user: PurchaseUser;
  exam: { id: string; title: string };
}

export interface AdminExplanationPurchase {
  id: number;
  questionNumber: number;
  price: number;
  isTrial: boolean;
  createdAt: string;
  user: PurchaseUser;
  exam: { id: string; title: string };
}

export interface QuestionChange {
  number: number;
  answer?: string;
  isReference?: boolean;
}

export interface PresenceData {
  guests: number;
  total: number; // tổng thành viên online (danh sách có thể bị cắt bớt)
  users: { userId: string; fullName: string; email: string; pages: string[] }[];
}

export const adminApi = {
  presence: () => http.get<PresenceData>("/admin/presence"),
  dashboard: () => http.get<DashboardOverview>("/admin/dashboard"),

  users: (f: UserFilter) =>
    http.list<User>("/admin/users", { ...f, limit: PAGE_SIZE }),
  updateUser: (
    id: string,
    body: Partial<Pick<User, "fullName" | "role" | "status">> & {
      emailVerified?: boolean;
    },
  ) => http.patch<User>(`/admin/users/${id}`, body),
  adjustBalance: (id: string, body: { amount: number; note: string }) =>
    http.post<User>(`/admin/users/${id}/balance`, body),

  user: (id: string) => http.get<User>(`/admin/users/${id}`),
  chatbot: () => http.get<ChatbotAdmin>("/admin/settings/chat"),
  saveChatbot: (body: ChatbotForm) =>
    http.put<ChatbotAdmin["settings"]>("/admin/settings/chat", body),
  clearChatbotCache: () => http.delete("/admin/settings/chat/cache"),
  reindexChatbot: () =>
    http.post<{
      total: number;
      updated: number;
      embedded: number;
      warning?: string;
    }>("/admin/settings/chat/reindex"),
  userSummary: (id: string) =>
    http.get<UserSummary>(`/admin/users/${id}/summary`),
  resetUserPassword: (id: string, password?: string) =>
    http.post<{ password: string }>(
      `/admin/users/${id}/reset-password`,
      password ? { password } : {},
    ),
  sendResetLink: (id: string) =>
    http.post<null>(`/admin/users/${id}/send-reset-link`),
  revokeUserSessions: (id: string) =>
    http.post<null>(`/admin/users/${id}/revoke-sessions`),
  impersonateUser: (id: string) =>
    http.post<{ token: string; user: User }>(`/admin/users/${id}/impersonate`),

  walletTransactions: (f: {
    page: number;
    userId?: string;
    search?: string;
    type?: TransactionType | "";
  }) =>
    http.list<AdminWalletTx>("/admin/wallet-transactions", {
      ...f,
      limit: PAGE_SIZE,
    }),
  crawlJobs: (f: {
    page: number;
    userId?: string;
    search?: string;
    status?: CrawlJobStatus | "";
  }) =>
    http.list<AdminCrawlJob>("/admin/crawl-jobs", { ...f, limit: PAGE_SIZE }),
  attempts: (f: {
    page: number;
    userId?: string;
    search?: string;
    mode?: "PRACTICE" | "EXAM" | "";
  }) => http.list<AdminAttempt>("/admin/attempts", { ...f, limit: PAGE_SIZE }),
  notices: (
    page: number,
    filter: {
      status: "unread" | "all";
      important?: boolean;
      category?: NoticeCategory;
    },
    limit = PAGE_SIZE,
  ) =>
    http.list<AdminNotice>("/admin/notices", {
      page,
      limit,
      status: filter.status,
      important: filter.important === undefined ? "" : String(filter.important),
      category: filter.category ?? "",
    }),
  noticeCounts: () => http.get<NoticeCounts>("/admin/notices/counts"),
  setNoticeRead: (id: string, read: boolean) =>
    http.patch<AdminNotice>(`/admin/notices/${id}`, { read }),
  readAllNotices: (filter: {
    important?: boolean;
    category?: NoticeCategory;
  }) => http.post<{ updated: number }>("/admin/notices/read-all", filter),
  readNoticeIds: (ids: string[]) =>
    http.post<{ updated: number }>("/admin/notices/read-ids", { ids }),
  deleteReadNotices: () => http.delete("/admin/notices/read"),
  sendSystemNotice: (body: {
    title: string;
    body?: string;
    link?: string;
    level?: AdminNotice["level"];
    key?: string; // cùng key khi gửi lại: server chỉ gửi tiếp cho người chưa nhận, không gửi trùng
  }) => http.post<{ sent: number }>("/admin/system-notices", body),
  subjects: () => http.get<{ subjects: SubjectRow[] }>("/admin/subjects"),
  subject: (code: string) =>
    http.get<SubjectDetail>(`/admin/subjects/${encodeURIComponent(code)}`),
  updateSubject: (code: string, patch: SubjectPatch) =>
    http.patch<SubjectDetail>(
      `/admin/subjects/${encodeURIComponent(code)}`,
      patch,
    ),
  clearInferredChapters: (code: string) =>
    http.delete(
      `/admin/subjects/${encodeURIComponent(code)}/inferred-chapters`,
    ),
  promoSettings: () => http.get<PromoSettings>("/admin/settings/promo"),
  savePromoSettings: (body: PromoSettings) =>
    http.put<PromoSettings>("/admin/settings/promo", body),
  accountSettings: () => http.get<AccountSettings>("/admin/settings/account"),
  saveAccountSettings: (body: AccountSettings) =>
    http.put<AccountSettings>("/admin/settings/account", body),
  crawlerSettings: () => http.get<CrawlerSettings>("/admin/settings/crawler"),
  saveCrawlerSettings: (body: CrawlerSettings) =>
    http.put<CrawlerSettings>("/admin/settings/crawler", body),
  linkRewardSettings: () =>
    http.get<LinkRewardAdmin>("/admin/settings/link-reward"),
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
  }) => http.put<LinkRewardAdmin>("/admin/settings/link-reward", body),

  giftCodes: (
    page: number,
    filter: { q?: string; active?: "true" | "false" | "" },
  ) =>
    http.list<GiftCode>("/admin/gift-codes", {
      page,
      limit: PAGE_SIZE,
      ...filter,
    }),
  createGiftCode: (body: GiftCodeForm) =>
    http.post<GiftCode>("/admin/gift-codes", body),
  setGiftCodeActive: (id: string, active: boolean) =>
    http.patch<GiftCode>(`/admin/gift-codes/${id}`, { active }),
  giftCodeRedemptions: (id: string, page: number) =>
    http.list<GiftCodeRedemption>(`/admin/gift-codes/${id}/redemptions`, {
      page,
      limit: PAGE_SIZE,
    }),

  explanationFeedback: (page: number, helpful: "up" | "down" | "", resolved: ResolvedFilter = "") =>
    http.list<ExplanationFeedbackAdmin>("/admin/explanation-feedback", { page, limit: PAGE_SIZE, helpful, resolved }),
  resolveFeedback: (id: string) =>
    http.post<ExplanationFeedbackAdmin>(`/admin/explanation-feedback/${id}/resolve`),
  reviewCounts: () => http.get<ReviewCounts>("/admin/review-counts"),
  explanationFeedbackSummary: () => http.get<{ up: number; down: number }>("/admin/explanation-feedback/summary"),
  answerReports: (page: number, status: ReportStatus | "", resolved: ResolvedFilter = "") =>
    http.list<AnswerReportAdmin>("/admin/answer-reports", {
      page,
      limit: PAGE_SIZE,
      status,
      resolved,
    }),
  approveReport: (id: string, body: { note?: string }) =>
    http.post<unknown>(`/admin/answer-reports/${id}/approve`, body),
  rejectReport: (id: string, body: { note?: string }) =>
    http.post<unknown>(`/admin/answer-reports/${id}/reject`, body),

  referralSettings: () =>
    http.get<ReferralSettings>("/admin/settings/referral"),
  saveReferralSettings: (body: ReferralSettings) =>
    http.put<ReferralSettings>("/admin/settings/referral", body),
  referralSummary: () => http.get<ReferralSummary>("/admin/referrals/summary"),
  referrals: (page: number) =>
    http.list<AdminReferral>("/admin/referrals", { page, limit: PAGE_SIZE }),

  deposits: (page: number, status?: DepositStatus | "", userId?: string) =>
    http.list<DepositOrder>("/admin/deposits", {
      page,
      limit: PAGE_SIZE,
      status,
      userId,
    }),
  bankTransactions: (page: number, status?: BankTxStatus | "") =>
    http.list<BankTransaction>("/admin/bank-transactions", {
      page,
      limit: PAGE_SIZE,
      status,
    }),

  sepayConfig: () => http.get<SepayAdminConfig>("/admin/settings/sepay"),
  saveSepayConfig: (body: SepayForm) =>
    http.put<SepayAdminConfig>("/admin/settings/sepay", body),
  aiConfig: () => http.get<AiAdminConfig>("/admin/settings/ai"),
  saveAiConfig: (body: AiForm) =>
    http.put<AiAdminConfig>("/admin/settings/ai", body),
  exams: (page: number, filter: { q?: string; kind?: string; source?: string } = {}) =>
    http.list<AdminExam>("/admin/exams", { page, limit: PAGE_SIZE, ...filter }),
  renameExam: (id: string, title: string) =>
    http.patch<ExamAdminDetail>(`/admin/exams/${id}`, { title }),
  deleteExam: (id: string) => http.delete(`/admin/exams/${id}`),
  // Tải đề dạng zip (ảnh + đáp án) rồi lưu xuống máy; trả về tên file đã lưu
  async downloadExam(id: string): Promise<string> {
    await http.get("/users/me").catch(() => undefined); // làm mới token nếu sắp hết hạn (fetch thô bên dưới không tự làm mới)
    let res: Response;
    try {
      res = await fetch(`${BASE}/admin/exams/${id}/download`, {
        headers: { Authorization: `Bearer ${tokenStore.get() ?? ""}` },
        credentials: "include",
      });
    } catch {
      throw new ApiError("Không kết nối được máy chủ", 0);
    }
    if (!res.ok) {
      throw toApiError(res, (await res.json().catch(() => null)) as { message?: string } | null);
    }
    const cd = res.headers.get("content-disposition") ?? "";
    const star = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = cd.match(/filename="?([^";]+)"?/i)?.[1];
    let filename = plain ?? `de-${id}.zip`;
    try {
      if (star) filename = decodeURIComponent(star);
    } catch {
      /* tên mã hoá lỗi: giữ tên thường */
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    return filename;
  },
  explanationUnlocks: (f: { page: number; userId?: string; search?: string }) =>
    http.list<AdminExplanationUnlock>("/admin/explanation-unlocks", {
      ...f,
      limit: PAGE_SIZE,
    }),
  explanationPurchases: (f: {
    page: number;
    userId?: string;
    search?: string;
  }) =>
    http.list<AdminExplanationPurchase>("/admin/explanation-purchases", {
      ...f,
      limit: PAGE_SIZE,
    }),
  examDetail: (id: string) => http.get<ExamAdminDetail>(`/admin/exams/${id}`),
  resolveQuestion: (id: string, number: number) =>
    http.post<QuestionResolve>(
      `/admin/exams/${id}/questions/${number}/resolve`,
    ),
  saveExamQuestions: (id: string, changes: QuestionChange[]) =>
    http.patch<ExamAdminDetail>(`/admin/exams/${id}/questions`, { changes }),
  solveExam: (id: string) => http.post<null>(`/admin/exams/${id}/solve`),
  examReport: (id: string) =>
    http.get<{ id: string; title: string; aiReport: string | null }>(
      `/admin/exams/${id}/report`,
    ),
  sepayStatus: () => http.get<SyncResult | null>("/admin/sepay/status"),
  syncNow: () => http.post<SyncResult>("/admin/sepay/sync"),
};
