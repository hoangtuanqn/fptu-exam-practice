import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Crown, LayoutGrid, Menu } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";

// Điều hướng chính dùng chung cho header trang chủ, /features, /kho-de, /pro. Từ màn hình vừa trở lên hiện thành hàng; điện thoại gom vào nút menu.
export function SiteNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const cls = (to: string) =>
    `md-state md-motion md-label-large inline-flex h-10 items-center gap-2 rounded-full px-4 ${pathname === to ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:text-on-surface"}`;
  return (
    <>
    <div className="relative md:hidden">
      {/* Trang làm đề (/exam/) giữ thanh trên gọn, không thêm nút */}
      {!pathname.startsWith("/exam/") && (
        <IconButton label="Mở menu điều hướng" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Menu size={22} />
        </IconButton>
      )}
      {open && (
        <div className="md-enter absolute left-0 top-full z-50 mt-1 w-56 rounded-m3-sm bg-surface-container py-2 shadow-m3-2">
          {[["/features", "Tính năng"], ["/kho-de", "Kho đề"], ["/pro", "Gói Pro"]].map(([to, text]) => (
            <Link key={to} to={to} className="md-state md-label-large flex h-12 items-center px-4 text-on-surface">
              {text}
            </Link>
          ))}
        </div>
      )}
    </div>
    <nav aria-label="Điều hướng chính" className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-4 md:flex">
      <Link to="/features" className={cls("/features")} aria-current={pathname === "/features" ? "page" : undefined}>
        <LayoutGrid size={18} /> Tính năng
      </Link>
      <Link to="/kho-de" className={cls("/kho-de")} aria-current={pathname === "/kho-de" ? "page" : undefined}>
        <BookOpen size={18} /> Kho đề
      </Link>
      <Link to="/pro" className={cls("/pro")} aria-current={pathname === "/pro" ? "page" : undefined}>
        <Crown size={18} className="text-[#f0a800]" /> Gói Pro
      </Link>
    </nav>
    </>
  );
}
