import type { User } from "@/shared/types/api";
import { http } from "@/shared/api/client";

export interface AuthResult {
  token: string;
  user: User;
}

export const authApi = {
  login: (body: { email: string; password: string }) => http.post<AuthResult>("/auth/login", body),
  register: (body: { email: string; fullName: string; password: string; referralCode?: string }) =>
    http.post<AuthResult>("/auth/register", body),
  forgotPassword: (email: string) => http.post<null>("/auth/forgot-password", { email }),
  resetPassword: (body: { token: string; password: string }) => http.post<null>("/auth/reset-password", body),
  googleConfig: () => http.get<{ clientId: string | null }>("/auth/google/config"),
  google: (body: { accessToken: string; referralCode?: string }) => http.post<AuthResult>("/auth/google", body),
  verifyEmail: (token: string) => http.post<{ email: string }>("/auth/verify-email", { token }),
  resendVerification: () => http.post<null>("/auth/resend-verification"),
  me: () => http.get<User>("/auth/me"),
  // Thu hồi phiên ở máy chủ và xoá cookie đăng nhập
  logout: () => http.post<null>("/auth/logout"),
};
