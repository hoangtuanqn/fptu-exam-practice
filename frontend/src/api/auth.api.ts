import type { User } from "../types/api";
import { http } from "./client";

export interface AuthResult {
  token: string;
  user: User;
}

export const authApi = {
  login: (body: { email: string; password: string }) => http.post<AuthResult>("/auth/login", body),
  register: (body: { email: string; fullName: string; password: string }) =>
    http.post<AuthResult>("/auth/register", body),
  me: () => http.get<User>("/auth/me"),
};
