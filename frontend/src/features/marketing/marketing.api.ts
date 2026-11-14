import { http } from "@/shared/api/client";

export type MarketingTopic = "review" | "offers" | "renewal" | "news";
export type UnsubscribeMode = "all" | "pause" | "topic";

// Loại thư người dùng tự tắt được; bit khớp cột marketing_muted_topics ở backend
export const MARKETING_TOPICS: { key: MarketingTopic; bit: number; label: string }[] = [
  { key: "review", bit: 1, label: "Nhắc ôn tập" },
  { key: "offers", bit: 2, label: "Gợi ý gói Pro" },
  { key: "renewal", bit: 4, label: "Nhắc gia hạn Pro" },
  { key: "news", bit: 8, label: "Tin tức và tính năng mới" },
];

export const marketingApi = {
  unsubscribe: (token: string, mode: UnsubscribeMode = "all", topic?: MarketingTopic) =>
    http.post<{ ok: boolean; mode?: UnsubscribeMode }>("/marketing/unsubscribe", { token, mode, topic }),
};
