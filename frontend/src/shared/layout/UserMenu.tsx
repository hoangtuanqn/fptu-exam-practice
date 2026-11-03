import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { formatCredit, initials } from "@/shared/utils/formatters";
import { buttonClass } from "@/shared/ui/Button";

const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100";

// Góc phải header: khách thấy nút Đăng nhập, thành viên thấy avatar + menu
export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (loading) return <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" className={buttonClass({ variant: "ghost" })}>
          Đăng nhập
        </Link>
        <Link to="/register" className={buttonClass({ variant: "primary", className: "hidden sm:inline-flex" })}>
          Đăng ký
        </Link>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-900/5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-xs font-semibold text-white shadow-sm">
          {initials(user.fullName)}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 animate-fade-in rounded-2xl border border-slate-200/80 bg-white p-2 shadow-pop">
          <div className="px-3 py-2">
            <div className="truncate text-sm font-medium text-slate-900">{user.fullName}</div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
              <Wallet size={13} /> Số dư <b className="tabular-nums text-slate-900">{formatCredit(user.balance)}</b>
            </div>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <Link to="/account" className={item} onClick={() => setOpen(false)}>
            <LayoutDashboard size={16} /> Tài khoản của tôi
          </Link>
          {user.role === "ADMIN" && (
            <Link to="/admin" className={item} onClick={() => setOpen(false)}>
              <ShieldCheck size={16} /> Trang quản trị
            </Link>
          )}
          <button
            className={item}
            onClick={() => {
              setOpen(false);
              signOut();
              navigate("/");
            }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
