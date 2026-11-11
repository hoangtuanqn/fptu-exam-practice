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
  ticket?: { validDays: number; maxOpen: number }; // vé Pro (mua trước, kích hoạt sau); máy chủ cũ chưa có thì không hiện lựa chọn này
  benefits: { freeFetch: boolean; freeExplain: boolean; freePe: boolean; unlimitedReview?: boolean; frequentQuestions?: boolean; topicReport?: boolean };
}

export interface PurchaseResult {
  proExpiresAt: string;
  renewed: boolean;
  balanceAfter: number;
  user: User;
}

// Vé Pro chưa kích hoạt
export interface ProTicket {
  id: number;
  plan: string; // PRO | SPRINT
  name: string;
  duration: string; // "4 tháng" | "14 ngày"
  price: number;
  expiresAt: string; // quá hạn này mà chưa kích hoạt thì không dùng được nữa
  createdAt: string;
}

export interface TicketPurchaseResult {
  ticket: { id: number; plan: string; expiresAt: string };
  balanceAfter: number;
  user: User;
}

export interface ActivateResult {
  proExpiresAt: string;
  renewed: boolean;
  user: User;
}

// Dữ kiện thật của người dùng để mời Pro đúng lúc
export interface PlanSignals {
  exam: { date: string; daysLeft: number; subjectCode: string | null; source: "FAP" | "USER" } | null; // kỳ thi gần nhất, chỉ có khi còn trong vài tuần tới
  spent: { days: number; total: number; fetch: number; explain: number; pe: number; minToShow: number }; // credit đã chi lẻ trong `days` ngày gần nhất
}

export const planApi = {
  info: () => http.get<PlanInfo>("/plan"),
  purchase: (plan: "PRO" | "SPRINT" = "PRO") => http.post<PurchaseResult>("/plan/purchase", { plan }),
  signals: () => http.get<PlanSignals>("/plan/signals"),
  tickets: () => http.get<ProTicket[]>("/plan/tickets"),
  buyTicket: (plan: "PRO" | "SPRINT" = "PRO") => http.post<TicketPurchaseResult>("/plan/tickets", { plan }),
  activateTicket: (id: number) => http.post<ActivateResult>(`/plan/tickets/${id}/activate`, {}),
};
