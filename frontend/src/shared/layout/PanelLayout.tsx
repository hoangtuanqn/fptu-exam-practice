import { Link, NavLink, Outlet } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { Footer } from "./Footer";
import { UserMenu } from "./UserMenu";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const link = ({ isActive }: { isActive: boolean }) =>
  `group flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${
    isActive
      ? "bg-white font-medium text-brand-700 shadow-soft ring-1 ring-slate-200/80"
      : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
  }`;

// Khung dùng chung cho panel người dùng và panel quản trị: thanh kính mờ + menu bên trái (mobile: dải cuộn ngang)
export function PanelLayout({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="glass sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="shrink-0" title={`Về trang ${brand.product}`}>
            <Logo className="h-7" />
          </Link>
          <span className="h-4 w-px bg-slate-200" />
          <span className="text-sm font-semibold text-slate-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-900 sm:block">
            ← {brand.product}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav
          aria-label={title}
          className="flex shrink-0 gap-1 overflow-x-auto p-3 lg:w-60 lg:flex-col lg:p-4"
        >
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon size={17} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:py-8 lg:pl-2 lg:pr-8">
          <div className="mx-auto w-full max-w-5xl animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
