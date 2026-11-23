import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { SiteNav } from "./SiteNav";
import { UserMenu } from "./UserMenu";
// Ngoại lệ đã biết (giống UserMenu): layout dùng chung lấy chuông từ feature
import { UserNoticeBell } from "@/features/notifications/UserNoticeBell";
// Ô tìm kiếm trên header: nằm trong feature search (ngoại lệ đã biết như UserNoticeBell)
import { SearchTrigger } from "@/features/search/GlobalSearch";

// Header của các trang công khai ngoài trang chủ (/features, /pro): giống header trang chủ (logo, tên, điều hướng, giao diện, tài khoản)
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-brand">
        <Link to="/" className="shrink-0" title={brand.company}>
          <Logo variant="full" className="h-10 sm:h-11" />
        </Link>
        <div className="site-header-product">
          <span className="h-5 w-px shrink-0 bg-outline-variant" />
          <span className="truncate">{brand.product}</span>
        </div>
      </div>
      <SiteNav />
      <div className="site-header-actions">
        <SearchTrigger />
        <UserNoticeBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
