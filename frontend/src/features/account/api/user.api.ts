import type { MyGiftRedemption, RedeemResult, User, WalletTransaction } from "@/shared/types/api";
import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export const userApi = {
  updateProfile: (body: { fullName: string }) => http.patch<User>("/users/me", body),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    http.patch<null>("/users/me/password", body),
  transactions: (page = 1, limit = PAGE_SIZE) => http.list<WalletTransaction>("/users/me/transactions", { page, limit }),
  changeEmail: (body: { email: string; password: string }) => http.post<null>("/users/me/email", body),
  redeemGiftCode: (code: string) => http.post<RedeemResult>("/gift-codes/redeem", { code }),
  myGiftCodes: (page = 1) => http.list<MyGiftRedemption>("/gift-codes/mine", { page, limit: PAGE_SIZE }),
};
