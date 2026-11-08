import { http } from "@/shared/api/client";
import type { User } from "@/shared/types/api";

export interface PlanInfo {
  code: string;
  name: string;
  months: number;
  price: number; // credit
  fuoPrice: number; // giá mua trực tiếp gói VIP trên FuOverflow, cùng thời hạn
  savings: number;
  savingsPercent: number;
  pricePerMonth: number;
  sprint: { code: string; name: string; days: number; price: number }; // gói Nước rút ngắn hạn
  benefits: { freeFetch: boolean; freeExplain: boolean; freePe: boolean; unlimitedReview?: boolean; topicReport?: boolean };
}

export interface PurchaseResult {
  proExpiresAt: string;
  renewed: boolean;
  balanceAfter: number;
  user: User;
}

export const planApi = {
  info: () => http.get<PlanInfo>("/plan"),
  purchase: (plan: "PRO" | "SPRINT" = "PRO") => http.post<PurchaseResult>("/plan/purchase", { plan }),
};
