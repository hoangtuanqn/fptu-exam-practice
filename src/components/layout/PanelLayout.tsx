import { Link, NavLink, Outlet } from "react-router-dom";
import { BookOpenCheck, type LucideIcon } from "lucide-react";
import { UserMenu } from "./UserMenu";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const link = ({ isActive }: { isActive: boolean }) =>
  `flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
    isActive ? "bg-brand-50 font-medium text-brand-900" : "text-slate-600 hover:bg-slate-100"
  }`;

// Khung dùng chung cho panel người dùng và panel quản trị: thanh trên + menu bên trái (mobile: dải cuộn ngang)
export function PanelLayout({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-white" title="Về trang luyện đề">
            <BookOpenCheck size={16} />
          </Link>
          <span className="font-serif text-lg font-semibold text-slate-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:block">
            Luyện đề
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav
          aria-label={title}
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 lg:w-56 lg:flex-col lg:border-b-0 lg:border-r lg:p-3"
        >
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-5xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
