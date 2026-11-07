import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, type AuthResult } from "./auth.api";
import { impersonation, setUnauthorizedHandler, tokenStore } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { refreshRealtimeAuth } from "@/shared/realtime/socket";
import type { User } from "@/shared/types/api";

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
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!tokenStore.get());

  const signOut = useCallback(() => {
    // Đang đăng nhập thay thành viên: "đăng xuất" nghĩa là quay về tài khoản admin (không thu hồi phiên của admin)
    if (impersonation.active()) {
      impersonation.end();
      window.location.assign("/admin/users");
      return;
    }
    tokenStore.clear();
    setUser(null);
    refreshRealtimeAuth();
    void authApi.logout().catch(() => undefined); // thu hồi phiên dài hạn ở máy chủ (không chờ)
  }, []);

  const signIn = useCallback(({ token, user }: AuthResult) => {
    tokenStore.set(token);
    setUser(user);
    refreshRealtimeAuth();
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      /* 401 đã được xử lý bởi unauthorized handler */
    }
  }, []);

  // Máy chủ từ chối phiên (hết hạn/bị thu hồi): đăng xuất NHƯNG nói rõ lý do, không để người dùng bỗng dưng bị đẩy ra trang đăng nhập.
  // Đăng nhập lại xong sẽ quay về đúng trang đang xem (RequireAuth nhớ trang).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const hadSession = !!tokenStore.get() && !impersonation.active();
      signOut();
      if (hadSession) toast.error("Phiên đăng nhập đã hết hạn nên bạn được đăng xuất. Hãy đăng nhập lại để tiếp tục, dữ liệu của bạn vẫn còn.", { duration: 8000 });
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut, toast]);

  // Có token sẵn thì xác thực lại với máy chủ khi mở trang
  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  // Công bố trạng thái đăng nhập lên thẻ <html> cho tiện ích Chrome FePass (chỉ "in"/"out" và tên hiển thị, TUYỆT ĐỐI không kèm token).
  // Đang xác thực lại phiên (loading) thì chưa công bố để tiện ích không nhận trạng thái sai.
  useEffect(() => {
    if (loading || impersonation.active()) return; // đăng nhập thay: không báo trạng thái cho tiện ích
    const root = document.documentElement;
    root.dataset.fepassAuth = user ? "in" : "out";
    if (user) root.dataset.fepassUser = user.fullName;
    else delete root.dataset.fepassUser;
  }, [user, loading]);

  const value = useMemo(() => ({ user, loading, signIn, signOut, refresh, setUser }), [user, loading, signIn, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider");
  return ctx;
}
