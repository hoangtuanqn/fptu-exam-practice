import { Link, useLocation } from "react-router-dom";
import { Crown, LayoutGrid } from "lucide-react";

// Điều hướng chính dùng chung cho header trang chủ, /features, /pro. Chỉ hiện từ màn hình vừa trở lên; điện thoại dùng menu tài khoản và chân trang.
export function SiteNav() {
  const { pathname } = useLocation();
  const cls = (to: string) =>
    `md-state md-motion md-label-large inline-flex h-10 items-center gap-2 rounded-full px-4 ${pathname === to ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:text-on-surface"}`;
  return (
    <nav aria-label="Điều hướng chính" className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-4 md:flex">
      <Link to="/features" className={cls("/features")} aria-current={pathname === "/features" ? "page" : undefined}>
        <LayoutGrid size={18} /> Tính năng
      </Link>
      <Link to="/pro" className={cls("/pro")} aria-current={pathname === "/pro" ? "page" : undefined}>
        <Crown size={18} className="text-[#f0a800]" /> Gói Pro
      </Link>
    </nav>
  );
}
