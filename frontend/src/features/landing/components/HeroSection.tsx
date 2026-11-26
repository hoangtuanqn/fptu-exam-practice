import { Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { ImportedExam } from "@/features/exam/types";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { brand } from "@/shared/brand/brand";
import { ExamSourcePicker } from "./ExamSourcePicker";
import { LibraryStats } from "./LibraryStats";
import { ValueTrio } from "./ValueTrio";
import { PromoDeadlineBanner } from "./PromoDeadlineBanner";
import { SignupGiftBanner } from "./SignupGiftBanner";
import { ProNudge } from "@/features/plan/ProNudge";
import { FirstRunChecklist } from "@/features/account/FirstRunChecklist";
import { useSeason } from "@/shared/season/SeasonContext";
import { XmasGreeting, XmasRibbon } from "./XmasRibbon";

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  userName?: string; // đã đăng nhập thì chào tên thay cho slogan
}

// Phần đầu trang: tiêu đề, ô chọn môn (việc chính, nằm ngay dưới tiêu đề), rồi mới tới số liệu kho đề, lời giới thiệu và ưu đãi.
// Đã chọn môn (?subject=) thì ẩn hết phần còn lại để danh sách đề lên đầu màn hình.
// Phong cách học thuật: nền giấy ấm, màu navy, một điểm nhấn vàng đồng, không chữ chuyển sắc hay hiệu ứng phát sáng.
export function HeroSection({ onPick, onImported, userName }: Props) {
  const isGuest = !userName;
  const { showDecor } = useSeason();
  const picked = !!useSearchParams()[0].get("subject");
  // Dòng nhấn mạnh trải nghiệm miễn phí: hiện cho cả khách và người đã đăng nhập
  const freeNote = (
    <p className="free-shine mx-auto mt-5 inline-flex max-w-full items-center justify-center gap-2 text-xl font-bold sm:text-2xl">
      <Sparkles size={22} aria-hidden className="shrink-0" />
      Được trải nghiệm miễn phí trước khi bạn trả tiền.
    </p>
  );

  return (
    <section className="relative isolate shrink-0 border-b border-outline-variant">
      {/* Nền: quầng sáng vàng ở đỉnh và lưới chấm mờ dần xuống dưới, tạo chiều sâu mà không làm rối chữ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-7rem] h-72 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-[#ffc61f]/20 blur-3xl" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(var(--md-sys-color-outline-variant)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_25%,transparent_100%)]" />
      </div>
      {showDecor && <XmasRibbon />}
      {showDecor && !picked && <XmasGreeting guest={isGuest} />}
      <div className={`mx-auto w-full max-w-3xl px-5 pb-10 text-center ${picked ? "pt-4" : isGuest ? "pt-5 sm:pt-7" : showDecor ? "pt-12 sm:pt-16" : "pt-6 sm:pt-12"}`}>
        {picked ? (
          <h1 className="sr-only">Chọn đề</h1>
        ) : (
          <div className="animate-fade-up">
            {/* Mùa Giáng sinh: lời chúc nằm đè đúng chỗ dòng tên sản phẩm (dòng này giữ chỗ nhưng ẩn), nên tiêu đề không bị đẩy xuống */}
            {isGuest && <p className={`md-label-large uppercase tracking-[0.2em] text-primary${showDecor ? " invisible" : ""}`}>{brand.product}</p>}

            <h1 className={`md-hero-title text-on-surface ${isGuest ? "mt-2" : "mt-5"}`}>
              {userName ? (
                <>
                  Chào <span className="italic text-primary">{userName}</span>, vào luyện thôi
                </>
              ) : (
                <>
                  Bạn đang ôn <span className="italic text-primary">môn nào?</span>
                </>
              )}
            </h1>
          </div>
        )}

        <div className="relative animate-fade-up [animation-delay:60ms]">
          <ExamSourcePicker onPick={onPick} onImported={onImported} picked={picked} />
        </div>

        {!picked && (
          <>
            {isGuest && (
              <div className="mt-8">
                <LibraryStats />
                {freeNote}
                <ValueTrio />
              </div>
            )}

            <PromoDeadlineBanner />

            {isGuest && <div className="mt-6"><SignupGiftBanner /></div>}

            {!isGuest && <FirstRunChecklist />}

            {/* Khách chưa thử gì thì chưa mời trả tiền: chỉ có dải quà đăng ký. Thành viên thấy lời mời Pro dựa trên dữ kiện thật của họ (hoặc dải Pro thường nếu chưa có). */}
            {!isGuest && <ProNudge />}
          </>
        )}
      </div>
    </section>
  );
}
