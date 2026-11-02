import type { User, WalletTransaction } from "@/shared/types/api";
import { http } from "@/shared/api/client";

export const userApi = {
  updateProfile: (body: { fullName: string }) => http.patch<User>("/users/me", body),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    http.patch<null>("/users/me/password", body),
  transactions: (page = 1, limit = 20) => http.list<WalletTransaction>("/users/me/transactions", { page, limit }),
};
