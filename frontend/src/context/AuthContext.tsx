import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, type AuthResult } from "../api/auth.api";
import { setUnauthorizedHandler, tokenStore } from "../api/client";
import type { User } from "../types/api";

interface AuthState {
  user: User | null;
  loading: boolean; // đang kiểm tra token lần đầu
  signIn: (result: AuthResult) => void;
  signOut: () => void;
  refresh: () => Promise<void>; // nạp lại user (ví dụ sau khi nạp tiền để cập nhật số dư)
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!tokenStore.get());

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const signIn = useCallback(({ token, user }: AuthResult) => {
    tokenStore.set(token);
    setUser(user);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      /* 401 đã được xử lý bởi unauthorized handler */
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Có token sẵn thì xác thực lại với máy chủ khi mở trang
  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut, refresh, setUser }), [user, loading, signIn, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider");
  return ctx;
}
