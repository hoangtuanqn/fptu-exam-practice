import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { SiteNav } from "./SiteNav";
import { UserMenu } from "./UserMenu";

// Header của các trang công khai ngoài trang chủ (/features, /pro): giống header trang chủ (logo, tên, điều hướng, giao diện, tài khoản)
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface/90 px-2 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" className="shrink-0" title={brand.company}>
          <Logo variant="full" className="h-10 sm:h-11" />
        </Link>
        <span className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" />
        <div className="hidden truncate text-base font-semibold tracking-tight text-slate-900 sm:block">{brand.product}</div>
      </div>
      <SiteNav />
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
