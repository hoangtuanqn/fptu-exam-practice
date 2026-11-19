import type { ImportedExam } from "@/features/exam-import/types";
import { ExtensionBar } from "./components/ExtensionBar";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { SemesterPromoBar } from "@/features/plan/SemesterPromoBar";
import { Footer } from "@/shared/layout/Footer";
import { CtaSection } from "./components/CtaSection";
import { FeatureShowcase } from "./components/FeatureShowcase";
import { HeroSection } from "./components/HeroSection";
import { LandingNoticePopup } from "./components/LandingNoticePopup";
import { PartnerAiSection } from "./components/PartnerAiSection";
import { StepsSection } from "./components/StepsSection";

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  userName?: string; // đã đăng nhập thì chào tên, ẩn phần giới thiệu

}

// Trang chủ = hero + (với khách) các phần giới thiệu + footer. Nội dung chữ ở content.ts, mỗi phần là một file trong components/.
export function Landing({ onPick, onImported, userName }: Props) {
  const isGuest = !userName;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-surface">
      <LandingNoticePopup />
      <SemesterPromoBar />
      <HeroSection onPick={onPick} onImported={onImported} userName={userName} />
      <ExtensionBar />

      {isGuest && (
        <>
          <FeatureShowcase />
          <StepsSection />
          <PartnerAiSection />
          <CtaSection />
        </>
      )}

      <Footer />
    </div>
  );
}
