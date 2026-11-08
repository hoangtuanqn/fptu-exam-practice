import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { FeatureShowcase } from "./components/FeatureShowcase";

// /features (công khai): chỉ có bảng tính năng, gọn trong một khung để chụp màn hình giới thiệu hệ thống
export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <FeatureShowcase standalone />
      </main>
      <Footer />
    </div>
  );
}
