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
  githubConfig: () => http.get<{ clientId: string | null; redirectUri: string | null }>("/auth/github/config"),
  github: (body: { code: string; referralCode?: string }) => http.post<AuthResult>("/auth/github", body),
  verifyEmail: (token: string) => http.post<{ email: string }>("/auth/verify-email", { token }),
  resendVerification: () => http.post<null>("/auth/resend-verification"),
  // Credit tặng khi đăng ký (công khai, 0 = không tặng)
  signupBonus: () => http.get<{ credit: number }>("/auth/signup-bonus"),
  me: () => http.get<User>("/auth/me"),
  // Thu hồi phiên ở máy chủ và xoá cookie đăng nhập
  logout: () => http.post<null>("/auth/logout"),
};
