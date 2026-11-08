import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { Footer } from "@/shared/layout/Footer";
import { UserMenu } from "@/shared/layout/UserMenu";
import { FeatureShowcase } from "./components/FeatureShowcase";

// /features (công khai): chỉ có bảng tính năng, gọn trong một khung để chụp màn hình giới thiệu hệ thống
export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface/90 px-3 backdrop-blur sm:px-4">
        <Link to="/" title={brand.company}>
          <Logo variant="full" className="h-10" />
        </Link>
        <UserMenu />
      </header>
      <main className="flex-1">
        <FeatureShowcase standalone />
      </main>
      <Footer />
    </div>
  );
}
