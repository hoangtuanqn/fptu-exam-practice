import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Crown, Home, ListChecks, LogIn, Menu, NotebookPen, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { IconButton } from "@/shared/ui/Button";
import { DrawerContent, type NavItem } from "./PanelLayout";

type Tab = { to: string; label: string; icon: LucideIcon; also?: string[] };

const MEMBER_TABS: Tab[] = [
  { to: "/", label: "Trang chủ", icon: Home },
  { to: "/account/exams", label: "Kho đề", icon: BookOpen, also: ["/kho-de"] },
  { to: "/account/review", label: "Ôn tập", icon: NotebookPen, also: ["/account/saved", "/account/frequent"] },
  { to: "/account/attempts", label: "Kết quả", icon: ListChecks, also: ["/account/reports", "/account/grades"] },
];
const GUEST_TABS: Tab[] = [
  { to: "/", label: "Trang chủ", icon: Home },
  { to: "/kho-de", label: "Kho đề", icon: BookOpen },
  { to: "/pro", label: "Gói Pro", icon: Crown },
  { to: "/login", label: "Đăng nhập", icon: LogIn },
];

// Chỉ hiện ở các trang duyệt nội dung; màn làm bài, đăng nhập, quản trị... không có thanh này.
// Trang đang làm đề ở "/" tự ẩn thanh qua thuộc tính data-no-bottom-nav (xem index.css).
const under = (pathname: string, p: string) => pathname === p || pathname.startsWith(`${p}/`);
function shown(pathname: string) {
  if (under(pathname, "/account/review/practice")) return false;
  return pathname === "/" || ["/kho-de", "/pro", "/features", "/changelog", "/mon", "/account"].some((p) => under(pathname, p));
}

// Thanh điều hướng dưới (M3 navigation bar) cho điện thoại (<600px). Mục "Thêm" mở danh sách đầy đủ của trang tài khoản.
export function BottomNav({ more }: { more: NavItem[] }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    sheet.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      opener.current?.focus?.();
    };
  }, [open]);

  if (!shown(pathname)) return null;
  const tabs = user ? MEMBER_TABS : GUEST_TABS;
  const active = (t: Tab) => (t.to === "/" ? pathname === "/" : [t.to, ...(t.also ?? [])].some((p) => under(pathname, p)));
  const pill = (on: boolean) =>
    `md-state md-motion flex h-8 w-14 items-center justify-center rounded-full ${on ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"}`;
  const label = (on: boolean) => `md-label-medium ${on ? "text-on-surface" : "text-on-surface-variant"}`;

  return (
    <>
      <nav
        data-bottom-nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-outline-variant bg-surface-container pb-[env(safe-area-inset-bottom)] medium:hidden expanded:hidden"
      >
        {tabs.map((t) => {
          const on = active(t);
          return (
            <Link key={t.to} to={t.to} aria-current={on ? "page" : undefined} className="flex h-16 flex-1 flex-col items-center justify-center gap-1">
              <span className={pill(on)}>
                <t.icon size={22} />
              </span>
              <span className={label(on)}>{t.label}</span>
            </Link>
          );
        })}
        {user && (
          <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className="flex h-16 flex-1 flex-col items-center justify-center gap-1">
            <span className={pill(open)}>
              <Menu size={22} />
            </span>
            <span className={label(open)}>Thêm</span>
          </button>
        )}
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] medium:hidden expanded:hidden">
          <div className="md-scrim-in absolute inset-0 bg-scrim/32" onClick={() => setOpen(false)} aria-hidden />
          <div
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Tài khoản"
            tabIndex={-1}
            className="md-enter absolute inset-x-0 bottom-0 h-[80dvh] overflow-hidden rounded-t-m3-xl bg-surface-container-low pb-[env(safe-area-inset-bottom)] shadow-m3-3 outline-none"
          >
            <IconButton label="Đóng menu" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10">
              <X size={22} />
            </IconButton>
            <DrawerContent title="Tài khoản" items={more} collapsible={false} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
