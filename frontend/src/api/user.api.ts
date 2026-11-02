import type { User, WalletTransaction } from "../types/api";
import { http } from "./client";

export const userApi = {
  updateProfile: (body: { fullName: string }) => http.patch<User>("/users/me", body),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    http.patch<null>("/users/me/password", body),
  transactions: (page = 1, limit = 20) => http.list<WalletTransaction>("/users/me/transactions", { page, limit }),
};
