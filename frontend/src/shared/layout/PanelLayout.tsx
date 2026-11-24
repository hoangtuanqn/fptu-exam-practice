import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Menu,
  PenLine,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { formatCredit } from "@/shared/utils/formatters";
import type { NavIconComponent } from "./navIcons";
import { NavIndicator, useNavIndicator } from "./NavIndicator";
import { PageSkeleton } from "@/shared/ui/Skeleton";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { Footer } from "./Footer";
import { UserMenu } from "./UserMenu";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { Fab, IconButton } from "@/shared/ui/Button";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { XmasGarland } from "@/shared/season/XmasArt";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon | NavIconComponent;
  end?: boolean;
  group?: string; // nhãn nhóm hiện phía trên mục đầu tiên của nhóm
  also?: string[]; // các trang con (hiện thành tab) cũng tô sáng mục này
  badge?: { count: number; label: string }; // số việc cần xem (ẩn khi 0); label đọc cho trình đọc màn hình
}

// Badge số của M3 (large badge) gắn vào mục menu; số thật đọc qua chữ ẩn để tên của liên kết đủ nghĩa
function NavBadge({ badge, className = "" }: { badge?: NavItem["badge"]; className?: string }) {
  if (!badge || !(badge.count > 0)) return null;
  return (
    <>
      <span
        aria-hidden
        className={`md-label-small panel-nav-badge ${className}`}
      >
        {badge.count > 99 ? "99+" : badge.count}
      </span>
      <span className="sr-only">, {badge.label}</span>
    </>
  );
}

// Nhóm có nhiều hơn chừng này mục mới xổ xuống/thu lại được; nhóm ít mục luôn hiện đủ cho gọn mắt
const FOLD_OVER = 5;

// Mục menu khớp với đường dẫn hiện tại (dài nhất thắng), dùng cho tiêu đề thanh trên
function currentItem(items: NavItem[], pathname: string) {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  return items
    .filter((i) => (i.end ? pathname === i.to : under(i.to) || !!i.also?.some(under)))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

// Ngăn điều hướng (navigation drawer) của M3: mục dạng viên thuốc cao 48dp, mục đang chọn nền secondary-container, tiêu đề nhóm title-small.
// Dùng làm ngăn cố định ở cỡ expanded và ngăn mở ra (modal) ở cỡ compact.
export function DrawerContent({
  title,
  items,
  onNavigate,
  collapsible,
}: {
  title: string;
  items: NavItem[];
  onNavigate: () => void;
  collapsible: boolean;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cur = currentItem(items, pathname);
  const activeGroup = cur?.group;
  const menu = useNavIndicator<HTMLElement>();
  // Chỉ nhóm chứa trang đang xem được mở sẵn; các nhóm khác thu lại cho menu gọn
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  );
  useEffect(() => {
    if (activeGroup)
      setOpen((o) => (o.has(activeGroup) ? o : new Set(o).add(activeGroup)));
  }, [activeGroup]);
  const toggle = (g: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (!next.delete(g)) next.add(g);
      return next;
    });
  const sections = useMemo(() => {
    const out: { group?: string; items: NavItem[] }[] = [];
    for (const it of items) {
      const last = out[out.length - 1];
      if (last && last.group === it.group) last.items.push(it);
      else out.push({ group: it.group, items: [it] });
    }
    return out;
  }, [items]);

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
          className="md-state md-motion md-label-large panel-drawer-cta"
        >
          <PenLine size={20} /> Vào luyện đề
        </Link>
      </div>

      <nav ref={menu.ref} aria-label={title} className="relative flex-1 overflow-y-auto px-3 pb-4">
        <NavIndicator box={menu.box} animate={menu.animate} />
        {sections.map((sec, si) => {
          const fold =
            collapsible && !!sec.group && sec.items.length > FOLD_OVER; // nhóm có nhãn thì xổ xuống/thu lại được
          const isOpen = !fold || open.has(sec.group!);
          return (
            <div key={sec.group ?? `s${si}`}>
              {sec.group &&
                (fold ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(sec.group!)}
                    className={`md-state md-motion md-title-small panel-nav-group ${si === 0 ? "mt-1" : "mt-1.5"}`}
                  >
                    <span>{sec.group}</span>
                    <span className="flex items-center gap-2">
                      {!isOpen && (
                        <span className="md-label-medium text-on-surface-variant/70">
                          {sec.items.length}
                        </span>
                      )}
                      {!isOpen && (() => {
                        const count = sec.items.reduce((n, i) => n + (i.badge?.count ?? 0), 0);
                        return <NavBadge badge={{ count, label: `${count} mục chưa xử lý` }} />;
                      })()}
                      <ChevronDown
                        size={18}
                        className={`md-motion transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>
                ) : (
                  <div
                    className={`md-title-small px-4 pb-1 text-on-surface-variant ${si === 0 ? "pt-2" : "pt-5"}`}
                  >
                    {sec.group}
                  </div>
                ))}
              {isOpen &&
                sec.items.map((it) => {
                  const { to, label, icon: Icon, end } = it;
                  const active = cur === it;
                  return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    data-nav-active={active || undefined}
                    className={`md-state md-motion md-label-large relative flex h-12 items-center gap-3 rounded-full px-4 ${fold ? "ml-2" : ""} ${
                      active ? "text-on-secondary-container" : "text-on-surface-variant"
                    }`}
                  >
                    <Icon size={28} className="shrink-0" />
                    <span className="truncate">{label}</span>
                    <NavBadge badge={it.badge} className="ml-auto" />
                  </NavLink>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {user && (
        <div className="flex shrink-0 items-center gap-3 border-t border-outline-variant p-4">
          <UserAvatar
            avatarPath={user.avatarPath}
            alt={user.fullName}
            className="h-10 w-10"
          />
          <div className="min-w-0 flex-1">
            <div className="md-title-small truncate text-on-surface">
              {user.fullName}
            </div>
            <div className="md-body-small truncate text-on-surface-variant">
              {user.email}
            </div>
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
  const cur = currentItem(items, useLocation().pathname);
  const menu = useNavIndicator<HTMLElement>();
  return (
    <div className="flex h-full w-20 flex-col items-center">
      <Link to="/" title={`Về trang ${brand.product}`} className="mt-3 block">
        <Logo className="h-9" />
      </Link>
      <Link
        to="/"
        aria-label="Vào luyện đề"
        title="Vào luyện đề"
        className="mt-4"
      >
        <Fab label="Vào luyện đề" tabIndex={-1} className="!h-14">
          <PenLine size={24} />
        </Fab>
      </Link>
      <nav
        ref={menu.ref}
        aria-label={title}
        className="relative mt-3 flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto pb-4"
      >
        <NavIndicator box={menu.box} animate={menu.animate} />
        {items.map((it) => {
          const { to, label, icon: Icon, end } = it;
          return (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className="group relative flex w-full flex-col items-center gap-1 px-1 py-1.5"
          >
            {() => {
              const isActive = cur === it;
              return (
              <>
                <span
                  data-nav-active={isActive || undefined}
                  className={`md-state md-motion relative flex h-8 w-14 items-center justify-center rounded-full ${isActive ? "text-on-secondary-container" : "text-on-surface-variant"}`}
                >
                  <Icon size={28} />
                  <NavBadge badge={it.badge} className="absolute left-8 top-0" />
                </span>
                <span
                  className={`md-label-medium w-full break-words text-center leading-tight ${isActive ? "text-on-surface" : "text-on-surface-variant"}`}
                >
                  {label}
                </span>
              </>
              );
            }}
          </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

// Khung dùng chung cho panel người dùng và panel quản trị, theo lớp kích thước cửa sổ M3:
//  - compact (<600px): thanh ứng dụng trên cùng + ngăn điều hướng mở ra (modal) vì có tới 10 đích đến, nhiều hơn mức tối đa 5 của thanh điều hướng dưới
//  - medium (600-839px): thanh điều hướng dọc (rail)
//  - expanded (>=840px): ngăn điều hướng cố định bên trái
export function PanelLayout({
  title,
  items,
  collapsible = false,
  actions,
  notice,
  bottomNav = false,
}: {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
  actions?: ReactNode;
  notice?: ReactNode; // thanh thông báo mỏng dưới thanh ứng dụng
  bottomNav?: boolean; // compact đã có thanh điều hướng dưới (BottomNav) nên bỏ nút mở ngăn
}) {
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
      {open && (
        <div
          className="md-scrim-in fixed inset-0 z-40 bg-scrim/32 medium:hidden expanded:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* medium: rail */}
      <aside className="panel-rail">
        <Rail title={title} items={items} />
      </aside>

      {/* compact: ngăn modal; expanded: ngăn cố định */}
      <aside
        ref={drawer}
        tabIndex={-1}
        aria-label={title}
        className={`md-motion panel-drawer expanded:translate-x-0 ${
          open ? "translate-x-0 shadow-m3-3" : "-translate-x-full"
        }`}
      >
        <IconButton
          label="Đóng menu"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 expanded:hidden"
        >
          <X size={22} />
        </IconButton>
        <DrawerContent
          title={title}
          items={items}
          collapsible={collapsible}
          onNavigate={() => setOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thanh ứng dụng trên cùng (small top app bar, cao 64dp) */}
        <header className="panel-topbar">
          <div className="flex min-w-0 items-center gap-1">
            {!bottomNav && (
              <IconButton
                label="Mở menu"
                onClick={() => setOpen(true)}
                className="medium:hidden expanded:hidden"
              >
                <Menu size={24} />
              </IconButton>
            )}
            <div className="md-title-large truncate pl-2 text-on-surface">
              {current?.label ?? title}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {user && (
              <Link
                to="/account/deposit"
                title="Nạp thêm credit"
                className="md-state md-motion md-label-large panel-credit-chip"
              >
                <Wallet size={16} />
                <span className="tabular-nums text-on-surface">
                  {formatCredit(user.balance)}
                </span>
              </Link>
            )}
            {actions}
            {/* Điện thoại: chọn giao diện đã có trong menu tài khoản, bỏ nút này để tiêu đề trang còn chỗ */}
            <ThemeToggle className="max-sm:hidden" />
            <UserMenu />
          </div>
          <XmasGarland />
        </header>

        <VerifyEmailNotice />
        {notice}

        <main className="panel-main">
          <div
            key={pathname}
            className="animate-fade-up mx-auto w-full max-w-7xl"
          >
            {/* Chunk của trang đang tải: chỉ thay phần nội dung, sidebar và tiêu đề giữ nguyên */}
            <ErrorBoundary resetKey={pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
