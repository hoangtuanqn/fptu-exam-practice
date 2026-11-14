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

export const marketingAdminApi = {
  overview: () => http.get<MarketingOverview>("/admin/marketing/overview"),
  setPaused: (paused: boolean) => http.put<{ paused: boolean }>("/admin/marketing/paused", { paused }),
  campaigns: () => http.get<Campaign[]>("/admin/marketing/campaigns"),
  setEnabled: (key: CampaignKey, enabled: boolean) => http.patch<Campaign>(`/admin/marketing/campaigns/${key}`, { enabled }),
  sendTest: (key: CampaignKey) => http.post<{ sent: number; to: string }>(`/admin/marketing/campaigns/${key}/test`),
  eligibleCount: () => http.get<EligibleCounts>("/admin/marketing/eligible-count"),
};
