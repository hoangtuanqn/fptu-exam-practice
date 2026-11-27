import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarCheck, Check, ChevronDown, Crown, LayoutDashboard, LogOut, Monitor, Moon, ShieldCheck, Snowflake, Sun, Wallet } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { formatCredit } from "@/shared/utils/formatters";
import { buttonClass } from "@/shared/ui/Button";
import { avatarTier, UserAvatar } from "@/shared/ui/UserAvatar";
import { OPEN_CHECKIN_EVENT } from "@/features/check-in/DailyCheckInPopup";
import { ProBadge } from "@/features/plan/ProBadge";
import { isPro, proDaysLeft } from "@/shared/utils/pro";
import { useTheme, type ThemeMode } from "@/shared/theme/ThemeContext";
import { useSeason } from "@/shared/season/SeasonContext";

// Mục menu M3: cao 48dp, chữ label-large, state layer khi di chuột/focus/nhấn
const item = "md-state md-motion md-label-large flex h-12 w-full items-center gap-3 px-4 text-left text-on-surface";

const THEMES: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "system", label: "Giao diện theo hệ thống", icon: Monitor },
  { mode: "light", label: "Giao diện sáng", icon: Sun },
  { mode: "dark", label: "Giao diện tối", icon: Moon },
];

// Góc phải thanh ứng dụng: khách thấy nút Đăng nhập/Đăng ký, thành viên thấy avatar + menu (menu M3: điều hướng bằng phím ↑ ↓ Home End, Esc đóng)
export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const { xmas, decor, setDecor } = useSeason();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // Mở menu: đưa focus vào mục đầu tiên
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const outside = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const onMenuKey = (e: ReactKeyboardEvent) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") return close();
    if (e.key === "Tab") return close(false);
    const to = e.key === "ArrowDown" ? (i + 1) % items.length : e.key === "ArrowUp" ? (i - 1 + items.length) % items.length : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : -1;
    if (to >= 0) {
      e.preventDefault();
      items[to]?.focus();
    }
  };

  if (loading) return <div className="h-10 w-10 animate-pulse rounded-full bg-surface-container-high" />;

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Link to="/login" className={buttonClass({ variant: "text" })}>
          Đăng nhập
        </Link>
        {/* Điện thoại: nút Đăng ký nằm ở thanh điều hướng dưới */}
        <span className="hidden medium:contents expanded:contents">
          <Link to="/register" className={buttonClass({ variant: "filled", })}>
            Đăng ký
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-label="Menu tài khoản"
        title="Menu tài khoản"
        aria-expanded={open}
        className="md-state md-motion relative flex h-12 shrink-0 items-center gap-2 rounded-full pl-1 pr-2 after:absolute after:inset-0 after:content-['']"
      >
        <UserAvatar avatarPath={user.avatarPath} alt={user.fullName} className="h-10 w-10" tier={avatarTier(user)} />
        <span className="hidden min-w-0 flex-col items-start text-left lg:flex">
          <span className="md-label-large flex max-w-[11rem] items-center gap-1.5 text-on-surface">
            <span className="truncate">{user.fullName}</span>
            {isPro(user) && <ProBadge />}
          </span>
          <span className="md-label-small flex items-center gap-1 text-on-surface-variant">
            <Wallet size={11} /> <b className="tabular-nums text-primary">{formatCredit(user.balance)}</b>
          </span>
        </span>
        <ChevronDown size={16} className="text-on-surface-variant" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu tài khoản"
          onKeyDown={onMenuKey}
          className="site-menu md-enter right-0 w-72"
        >
          <div className="flex items-center gap-3 px-4 pb-2 pt-1">
            <UserAvatar avatarPath={user.avatarPath} alt={user.fullName} className="h-11 w-11" tier={avatarTier(user)} />
            <div className="min-w-0 flex-1">
              <div className="md-title-small flex items-center gap-1.5">
                <span className="truncate">{user.fullName}</span>
                {isPro(user) && <ProBadge />}
              </div>
              <div className="md-body-small truncate text-on-surface-variant">{user.email}</div>
            </div>
          </div>
          <div className="md-body-small flex items-center gap-1.5 px-4 pb-2 text-on-surface-variant">
            <Wallet size={14} /> Số dư <b className="tabular-nums text-on-surface">{formatCredit(user.balance)}</b>
          </div>
          <div role="separator" className="my-1 h-px bg-outline-variant" />
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              close(false);
              window.dispatchEvent(new Event(OPEN_CHECKIN_EVENT));
            }}
          >
            <CalendarCheck size={20} className="text-on-surface-variant" /> Điểm danh nhận thưởng
          </button>
          <Link role="menuitem" to="/pro" className={`${item} font-semibold`} onClick={() => close(false)}>
            <Crown size={20} className="text-[#f0a800]" />
            {isPro(user) ? `Gói Pro · còn ${proDaysLeft(user)} ngày` : "Nâng cấp Pro"}
          </Link>
          <Link role="menuitem" to="/account" className={item} onClick={() => close(false)}>
            <LayoutDashboard size={20} className="text-on-surface-variant" /> Tài khoản của tôi
          </Link>
          {user.role === "ADMIN" && (
            <Link role="menuitem" to="/admin" className={item} onClick={() => close(false)}>
              <ShieldCheck size={20} className="text-on-surface-variant" /> Trang quản trị
            </Link>
          )}
          <div role="separator" className="my-1 h-px bg-outline-variant" />
          {THEMES.map(({ mode: m, label, icon: Icon }) => (
            <button key={m} role="menuitemradio" aria-checked={mode === m} className={item} onClick={() => setMode(m)}>
              <Icon size={20} className="text-on-surface-variant" />
              <span className="flex-1">{label}</span>
              {mode === m && <Check size={18} className="text-primary" />}
            </button>
          ))}
          {xmas && (
            <button role="menuitemcheckbox" aria-checked={decor} className={item} onClick={() => setDecor(!decor)}>
              <Snowflake size={20} className="text-on-surface-variant" />
              <span className="flex-1">Trang trí Giáng sinh</span>
              {decor && <Check size={18} className="text-primary" />}
            </button>
          )}
          <div role="separator" className="my-1 h-px bg-outline-variant" />
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              close(false);
              signOut();
              navigate("/");
            }}
          >
            <LogOut size={20} className="text-on-surface-variant" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
