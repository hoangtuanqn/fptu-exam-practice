import type { DepositInfo, DepositOrder, DepositPayment, DepositStatus } from "@/shared/types/api";
import { http } from "@/shared/api/client";

export interface DepositDetail {
  order: DepositOrder;
  payment?: DepositPayment; // chỉ có khi lệnh còn chờ thanh toán
}

export interface PublicDepositDetail {
  order: { code: string; amount: number; status: DepositStatus; createdAt: string; expiresAt: string; paidAt: string | null };
  payment?: DepositPayment;
}

export const depositApi = {
  info: () => http.get<DepositInfo>("/deposits/info"),
  create: (amount: number) => http.post<DepositDetail>("/deposits", { amount }),
  get: (code: string) => http.get<DepositDetail>(`/deposits/${encodeURIComponent(code)}`),
  // Bản xem công khai (không cần đăng nhập): không có thông tin người tạo
  getPublic: (code: string) => http.get<PublicDepositDetail>(`/public/deposits/${encodeURIComponent(code)}`),
  list: (page = 1, status?: DepositStatus) => http.list<DepositOrder>("/deposits", { page, limit: 10, status }),
};
