import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export type CampaignKey = "winback" | "pro_upsell" | "pro_expiry";

export interface Campaign {
  key: CampaignKey;
  label: string;
  description: string;
  enabled: boolean;
  steps: { step: number; sentCount: number }[];
}

export type EligibleCounts = Partial<Record<CampaignKey, number>>;

export interface FunnelRow {
  sent: number;
  clicked: number;
  bought: number;
  returned: number;
  pending: number;
}

export interface MarketingOverview {
  status: { sentToday: number; dailyCap: number; nextRun: string; smtpConfigured: boolean; optOutRate: number; paused: boolean };
  funnel: Partial<Record<CampaignKey | "broadcast", FunnelRow>>;
}

export type BroadcastSegment = "all" | "pro" | "free" | "inactive" | "exam_soon";
export type BroadcastStatus = "DRAFT" | "SENDING" | "DONE" | "CANCELLED";

export interface Broadcast {
  id: number;
  subject: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
  segment: BroadcastSegment;
  segmentDays: number | null;
  status: BroadcastStatus;
  createdAt: string;
  sent?: number;
  clicked?: number;
}

export interface BroadcastInput {
  subject: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
  segment: BroadcastSegment;
  segmentDays?: number;
}

export interface MarketingLog {
  id: number;
  sentAt: string;
  email: string;
  campaign: string; // CampaignKey hoặc broadcast:<id>
  step: number;
  clicked: boolean;
  bought: boolean;
  returned: boolean;
}

export interface LogFilter {
  campaign?: string;
  from?: string;
  to?: string;
  email?: string;
  page: number;
}

export interface MarketingParamValues {
  dailyCap: number;
  minGapDays: number;
  winbackStepDays: number[];
  winbackMaxInactiveDays: number;
  upsellMinPurchases: number;
  upsellRepeatDays: number;
  expiryStepDays: number[];
}
export type ParamKey = keyof MarketingParamValues;

export interface MarketingParams {
  values: MarketingParamValues;
  defaults: MarketingParamValues;
  limits: Partial<Record<ParamKey, { min: number; max: number }>>;
}

export const marketingAdminApi = {
  overview: () => http.get<MarketingOverview>("/admin/marketing/overview"),
  setPaused: (paused: boolean) => http.put<{ paused: boolean }>("/admin/marketing/paused", { paused }),
  campaigns: () => http.get<Campaign[]>("/admin/marketing/campaigns"),
  setEnabled: (key: CampaignKey, enabled: boolean) => http.patch<Campaign>(`/admin/marketing/campaigns/${key}`, { enabled }),
  sendTest: (key: CampaignKey) => http.post<{ sent: number; to: string }>(`/admin/marketing/campaigns/${key}/test`),
  eligibleCount: () => http.get<EligibleCounts>("/admin/marketing/eligible-count"),
  params: () => http.get<MarketingParams>("/admin/marketing/params"),
  saveParams: (values: Partial<MarketingParamValues>) => http.put<MarketingParams>("/admin/marketing/params", values),
  resetParams: () => http.post<MarketingParams>("/admin/marketing/params/reset"),
  preview: (key: CampaignKey, step: number) => http.get<{ subject: string; html: string }>(`/admin/marketing/campaigns/${key}/preview`, { step }),
  broadcasts: (page: number) => http.list<Broadcast>("/admin/marketing/broadcasts", { page, limit: PAGE_SIZE }),
  createBroadcast: (body: BroadcastInput) => http.post<Broadcast>("/admin/marketing/broadcasts", body),
  estimateBroadcast: (id: number) => http.get<{ recipients: number; days: number }>(`/admin/marketing/broadcasts/${id}/estimate`),
  previewBroadcast: (id: number) => http.get<{ subject: string; html: string }>(`/admin/marketing/broadcasts/${id}/preview`),
  testBroadcast: (id: number) => http.post<{ sent: number; to: string }>(`/admin/marketing/broadcasts/${id}/test`),
  startBroadcast: (id: number, confirm: string) => http.post<Broadcast>(`/admin/marketing/broadcasts/${id}/start`, { confirm }),
  cancelBroadcast: (id: number) => http.post<Broadcast>(`/admin/marketing/broadcasts/${id}/cancel`),
  logs: (f: LogFilter) => http.list<MarketingLog>("/admin/marketing/logs", { ...f, limit: PAGE_SIZE }),
};
