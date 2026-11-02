import type { DepositInfo, DepositOrder, DepositPayment, DepositStatus } from "@/shared/types/api";
import { http } from "@/shared/api/client";

export interface DepositDetail {
  order: DepositOrder;
  payment?: DepositPayment; // chỉ có khi lệnh còn chờ thanh toán
}

export const depositApi = {
  info: () => http.get<DepositInfo>("/deposits/info"),
  create: (amount: number) => http.post<DepositDetail>("/deposits", { amount }),
  get: (id: number) => http.get<DepositDetail>(`/deposits/${id}`),
  list: (page = 1, status?: DepositStatus) => http.list<DepositOrder>("/deposits", { page, limit: 10, status }),
};
