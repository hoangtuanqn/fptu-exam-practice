import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { PageSkeleton } from "@/shared/ui/Skeleton";
import type { Role } from "@/shared/types/api";

// Chặn trang cần đăng nhập. Chưa đăng nhập → /login (nhớ trang đang vào để quay lại sau).
export function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/account" replace />;
  return <Outlet />;
}

// Trang chỉ dành cho khách (đăng nhập/đăng ký): đã đăng nhập thì chuyển đi chỗ khác
export function GuestOnly() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  if (loading) return <PageSkeleton />;
  // Vừa đăng ký: vào thẳng trang chủ (ô chọn môn) để tới bài đầu tiên nhanh nhất; đăng nhập thường vẫn về Tài khoản
  const home = user?.role === "ADMIN" ? "/admin" : location.pathname === "/register" ? "/" : "/account";
  if (user) return <Navigate to={from ?? home} replace />;
  return <Outlet />;
}
