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
  purchase: () => http.post<PurchaseResult>("/plan/purchase"),
};
