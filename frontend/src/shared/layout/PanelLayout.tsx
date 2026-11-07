import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, PenLine, Wallet, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { formatCredit } from "@/shared/utils/formatters";
import { Footer } from "./Footer";
import { UserMenu } from "./UserMenu";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { Fab, IconButton } from "@/shared/ui/Button";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  group?: string; // nhãn nhóm hiện phía trên mục đầu tiên của nhóm
}

// Mục menu khớp với đường dẫn hiện tại (dài nhất thắng), dùng cho tiêu đề thanh trên
function currentItem(items: NavItem[], pathname: string) {
  return items
    .filter((i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

// Ngăn điều hướng (navigation drawer) của M3: mục dạng viên thuốc cao 48dp, mục đang chọn nền secondary-container, tiêu đề nhóm title-small.
// Dùng làm ngăn cố định ở cỡ expanded và ngăn mở ra (modal) ở cỡ compact.
function DrawerContent({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between pl-4 pr-16 expanded:pr-4">
        <Link to="/" onClick={onNavigate} title={`Về trang ${brand.product}`}>
          <Logo variant="full" className="h-10" />
        </Link>
      </div>

      <div className="px-3 pb-2">
        <Link
          to="/"
          onClick={onNavigate}
          className="md-state md-motion md-label-large flex h-14 items-center justify-center gap-3 rounded-m3-lg bg-primary-container text-on-primary-container shadow-m3-1"
        >
          <PenLine size={20} /> Vào luyện đề
        </Link>
      </div>

      <nav aria-label={title} className="flex-1 overflow-y-auto px-3 pb-4">
        {items.map(({ to, label, icon: Icon, end, group }, i) => (
          <div key={to}>
            {group && group !== items[i - 1]?.group && <div className={`md-title-small px-4 pb-1 text-on-surface-variant ${i === 0 ? "pt-2" : "pt-5"}`}>{group}</div>}
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `md-state md-motion md-label-large flex h-12 items-center gap-3 rounded-full px-4 ${
                  isActive ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {user && (
        <div className="flex shrink-0 items-center gap-3 border-t border-outline-variant p-4">
          <UserAvatar avatarPath={user.avatarPath} alt={user.fullName} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <div className="md-title-small truncate text-on-surface">{user.fullName}</div>
            <div className="md-body-small truncate text-on-surface-variant">{user.email}</div>
          </div>
          <IconButton
            label="Đăng xuất"
            onClick={() => {
              signOut();
              navigate("/");
            }}
          >
            <LogOut size={20} />
          </IconButton>
        </div>
      )}
    </div>
  );
}

// Thanh điều hướng dọc (navigation rail) của M3 cho cỡ medium: biểu tượng 56x32 trong viên thuốc (đang chọn: secondary-container) + nhãn nhỏ bên dưới.
// Nút luyện đề là FAB (hành động chính duy nhất của khung này).
function Rail({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="flex h-full w-20 flex-col items-center">
      <Link to="/" title={`Về trang ${brand.product}`} className="mt-3 block">
        <Logo className="h-9" />
      </Link>
      <Link to="/" aria-label="Vào luyện đề" title="Vào luyện đề" className="mt-4">
        <Fab label="Vào luyện đề" tabIndex={-1} className="!h-14">
          <PenLine size={24} />
        </Fab>
      </Link>
      <nav aria-label={title} className="mt-3 flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto pb-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} title={label} className="group flex w-full flex-col items-center gap-1 px-1 py-1.5">
            {({ isActive }) => (
              <>
                <span className={`md-state md-motion flex h-8 w-14 items-center justify-center rounded-full ${isActive ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"}`}>
                  <Icon size={22} />
                </span>
                <span className={`md-label-medium w-full break-words text-center leading-tight ${isActive ? "text-on-surface" : "text-on-surface-variant"}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// Khung dùng chung cho panel người dùng và panel quản trị, theo lớp kích thước cửa sổ M3:
//  - compact (<600px): thanh ứng dụng trên cùng + ngăn điều hướng mở ra (modal) vì có tới 10 đích đến, nhiều hơn mức tối đa 5 của thanh điều hướng dưới
//  - medium (600-839px): thanh điều hướng dọc (rail)
//  - expanded (>=840px): ngăn điều hướng cố định bên trái
export function PanelLayout({ title, items }: { title: string; items: NavItem[] }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const current = currentItem(items, pathname);
  const drawer = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Đổi trang thì đóng ngăn; Esc cũng đóng; mở ngăn thì đưa focus vào trong và trả focus về nút mở khi đóng
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    drawer.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      opener.current?.focus?.();
    };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-surface">
      {open && <div className="md-scrim-in fixed inset-0 z-40 bg-scrim/32 medium:hidden expanded:hidden" onClick={() => setOpen(false)} aria-hidden />}

      {/* medium: rail */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-outline-variant bg-surface medium:block expanded:hidden">
        <Rail title={title} items={items} />
      </aside>

      {/* compact: ngăn modal; expanded: ngăn cố định */}
      <aside
        ref={drawer}
        tabIndex={-1}
        aria-label={title}
        className={`md-motion fixed inset-y-0 left-0 z-50 w-[min(22.5rem,85vw)] rounded-r-m3-xl bg-surface-container-low outline-none medium:hidden expanded:sticky expanded:top-0 expanded:z-20 expanded:block expanded:h-screen expanded:w-72 expanded:translate-x-0 expanded:rounded-none expanded:border-r expanded:border-outline-variant expanded:bg-surface ${
          open ? "translate-x-0 shadow-m3-3" : "-translate-x-full"
        }`}
      >
        <IconButton label="Đóng menu" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 expanded:hidden">
          <X size={22} />
        </IconButton>
        <DrawerContent title={title} items={items} onNavigate={() => setOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thanh ứng dụng trên cùng (small top app bar, cao 64dp) */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 bg-surface px-2 sm:px-4 expanded:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <IconButton label="Mở menu" onClick={() => setOpen(true)} className="medium:hidden expanded:hidden">
              <Menu size={24} />
            </IconButton>
            <h1 className="md-title-large truncate pl-2 text-on-surface">{current?.label ?? title}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {user && (
              <Link
                to="/account/deposit"
                title="Nạp thêm credit"
                className="md-state md-motion md-label-large mr-1 hidden h-8 items-center gap-2 rounded-m3-sm border border-outline px-3 text-on-surface-variant sm:flex"
              >
                <Wallet size={16} />
                <span className="tabular-nums text-on-surface">{formatCredit(user.balance)}</span>
              </Link>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <VerifyEmailNotice />

        <main className="flex-1 px-4 pb-6 pt-2 sm:px-6 expanded:px-8 expanded:pb-8">
          <div key={pathname} className="animate-fade-up mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
