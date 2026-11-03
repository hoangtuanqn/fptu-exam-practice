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
  me: () => http.get<User>("/auth/me"),
};
