import { http } from "@/shared/api/client";

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
  funnel: Partial<Record<CampaignKey, FunnelRow>>;
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
};
