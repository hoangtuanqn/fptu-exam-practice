import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Loading } from "@/shared/ui/Feedback";
import type { Role } from "@/shared/types/api";

// Chặn trang cần đăng nhập. Chưa đăng nhập → /login (nhớ trang đang vào để quay lại sau).
export function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/account" replace />;
  return <Outlet />;
}

// Trang chỉ dành cho khách (đăng nhập/đăng ký): đã đăng nhập thì chuyển đi chỗ khác
export function GuestOnly() {
  const { user, loading } = useAuth();
  const from = (useLocation().state as { from?: string } | null)?.from;

  if (loading) return <Loading />;
  if (user) return <Navigate to={from ?? (user.role === "ADMIN" ? "/admin" : "/account")} replace />;
  return <Outlet />;
}
