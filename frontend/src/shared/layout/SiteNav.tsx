import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";
import { NAV_ICON } from "./navIcons";

const LINKS = [
  { to: "/kho-de", text: "Kho đề", icon: NAV_ICON.library },
  { to: "/flashcard", text: "Flashcard", icon: NAV_ICON.flashcard },
  { to: "/account/coursera", text: "Coursera", icon: NAV_ICON.coursera },
  { to: "/pro", text: "Gói Pro", icon: NAV_ICON.pro },
];

// Điều hướng chính dùng chung cho header trang chủ, /features, /kho-de, /pro (bậc bề rộng: xem .site-header trong site.css).
// Từ 1280px hiện thành hàng; 600-1279px gom vào nút menu cạnh cụm nút bên phải;
// điện thoại (<600px) dùng thanh điều hướng dưới (BottomNav) nên không có nút này.
export function SiteNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
    <div className="relative ml-auto hidden shrink-0 medium:block expanded:block xl:!hidden">
      {/* Trang làm đề (/exam/) giữ thanh trên gọn, không thêm nút */}
      {!pathname.startsWith("/exam/") && (
        <IconButton label="Mở menu điều hướng" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Menu size={22} />
        </IconButton>
      )}
      {open && (
        <div className="site-menu md-enter right-0 w-56">
          {LINKS.map(({ to, text }) => (
            <Link key={to} to={to} aria-current={pathname === to ? "page" : undefined} className="md-state md-label-large flex h-12 items-center px-4 text-on-surface">
              {text}
            </Link>
          ))}
        </div>
      )}
    </div>
    <nav aria-label="Điều hướng chính" className="hidden flex-1 items-center justify-center gap-1 xl:flex">
      {LINKS.map(({ to, text, icon: Icon }) => (
        <Link key={to} to={to} className="site-nav-link md-state md-motion md-label-large" aria-current={pathname === to ? "page" : undefined}>
          <Icon size={24} /> {text}
        </Link>
      ))}
    </nav>
    </>
  );
}
