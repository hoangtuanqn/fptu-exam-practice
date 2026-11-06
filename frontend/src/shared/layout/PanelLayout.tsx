import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LogOut, Menu, PenLine, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { formatCredit } from "@/shared/utils/formatters";
import { Footer } from "./Footer";
import { UserMenu } from "./UserMenu";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  group?: string; // nhãn nhóm hiện phía trên mục đầu tiên của nhóm
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
    isActive
      ? "bg-slate-100 font-medium text-slate-900"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;

// Mục menu khớp với đường dẫn hiện tại (dài nhất thắng), dùng cho đường dẫn trên header
function currentItem(items: NavItem[], pathname: string) {
  return items
    .filter((i) =>
      i.end
        ? pathname === i.to
        : pathname === i.to || pathname.startsWith(`${i.to}/`),
    )
    .sort((a, b) => b.to.length - a.to.length)[0];
}

function Sidebar({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 pl-5 pr-14 lg:pr-5">
        <Link to="/" onClick={onNavigate} title={`Về trang ${brand.product}`}>
          <Logo className="h-6" />
        </Link>
        <span className="eyebrow !text-brand-700">{title}</span>
      </div>

      <nav aria-label={title} className="flex-1 overflow-y-auto px-3 py-4">
        {items.map(({ to, label, icon: Icon, end, group }, i) => (
          <div key={to}>
            {group && group !== items[i - 1]?.group && (
              <div className={`eyebrow mb-1.5 px-3 ${i === 0 ? "" : "mt-6"}`}>
                {group}
              </div>
            )}
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={linkClass}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600" />
                  )}
                  <Icon
                    size={17}
                    className={`shrink-0 ${isActive ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}`}
                  />
                  {label}
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <PenLine size={15} /> Vào luyện đề
        </Link>
        {user && (
          <div className="mt-3 flex items-center gap-3 px-1">
            <UserAvatar avatarPath={user.avatarPath} alt={user.fullName} className="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">
                {user.fullName}
              </div>
              <div className="truncate text-xs text-slate-500">
                {user.email}
              </div>
            </div>
            <button
              onClick={() => {
                signOut();
                navigate("/");
              }}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Khung dùng chung cho panel người dùng và panel quản trị:
// sidebar phẳng cố định bên trái (điện thoại: ngăn kéo), thanh trên có đường dẫn + số dư, nội dung rộng rãi
export function PanelLayout({
  title,
  items,
}: {
  title: string;
  items: NavItem[];
}) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const current = currentItem(items, pathname);

  // Đổi trang thì đóng ngăn kéo; Esc cũng đóng
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <div className="flex min-h-screen bg-paper">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0 shadow-pop" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
          className="absolute right-3 top-3.5 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X size={18} />
        </button>
        <Sidebar
          title={title}
          items={items}
          onNavigate={() => setOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Mở menu"
              className="-ml-1 rounded-md p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            >
              <Menu size={19} />
            </button>
            <nav
              aria-label="Đường dẫn"
              className="flex min-w-0 items-center gap-2 text-sm"
            >
              <span className="hidden text-slate-400 sm:inline">
                {title}
              </span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span className="truncate font-semibold text-slate-900">
                {current?.label ?? title}
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {user && (
              <Link
                to="/account/deposit"
                title="Nạp thêm credit"
                className="hidden items-baseline gap-2 rounded-md border border-slate-300 px-3 py-1.5 transition hover:border-slate-900 sm:flex"
              >
                <span className="eyebrow">Số dư</span>
                <span className="text-sm font-medium tabular-nums text-slate-900">
                  {formatCredit(user.balance)}
                </span>
              </Link>
            )}
            <UserMenu />
          </div>
        </header>

        <VerifyEmailNotice />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div
            key={pathname}
            className="mx-auto w-full max-w-7xl animate-fade-up"
          >
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
