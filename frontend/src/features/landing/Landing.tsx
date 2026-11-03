import type { ImportedExam } from "@/features/exam-import/types";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { Footer } from "@/shared/layout/Footer";
import { CtaSection } from "./components/CtaSection";
import { HeroSection } from "./components/HeroSection";
import { PartnerAiSection } from "./components/PartnerAiSection";
import { StepsSection } from "./components/StepsSection";

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  userName?: string; // đã đăng nhập thì chào tên, ẩn phần giới thiệu
  trialUsed: boolean; // khách đã dùng hết lượt thử
}

// Trang chủ = hero + (với khách) các phần giới thiệu + footer. Nội dung chữ ở content.ts, mỗi phần là một file trong components/.
export function Landing({ onPick, onImported, userName, trialUsed }: Props) {
  const isGuest = !userName;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-paper">
      <HeroSection onPick={onPick} onImported={onImported} userName={userName} trialUsed={trialUsed} />

      {isGuest && (
        <>
          <StepsSection />
          <PartnerAiSection />
          <CtaSection />
        </>
      )}

      <Footer />
    </div>
  );
}
