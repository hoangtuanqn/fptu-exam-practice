import type { ImportedExam } from "@/features/exam/types";
import { ExtensionBar } from "./components/ExtensionBar";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { SemesterPromoBar } from "@/features/plan/SemesterPromoBar";
import { Footer } from "@/shared/layout/Footer";
import { CtaSection } from "./components/CtaSection";
import { FeatureShowcase } from "./components/FeatureShowcase";
import { HeroSection } from "./components/HeroSection";
import { LandingNoticePopup } from "./components/LandingNoticePopup";
import { useSearchParams } from "react-router-dom";

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  userName?: string; // đã đăng nhập thì chào tên, ẩn phần giới thiệu

}

// Trang chủ = hero + (với khách) các phần giới thiệu + footer. Nội dung chữ ở content.ts, mỗi phần là một file trong components/.
export function Landing({ onPick, onImported, userName }: Props) {
  const isGuest = !userName;
  const picked = !!useSearchParams()[0].get("subject");

  return (
    // Đang xem danh sách đề của một môn: ẩn nút chat nổi trên màn nhỏ để không che giá và mũi tên của từng dòng
    <div className="flex flex-1 flex-col overflow-y-auto bg-surface" data-hide-chat={picked || undefined}>
      <LandingNoticePopup />
      <SemesterPromoBar />
      <HeroSection onPick={onPick} onImported={onImported} userName={userName} />

      {isGuest && (
        <>
          <FeatureShowcase />
          <CtaSection />
        </>
      )}

      <ExtensionBar />

      <Footer />
    </div>
  );
}
