import type { ImportedExam } from "@/features/exam-import/types";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { brand, logos } from "@/shared/brand/brand";
import { FEATURES } from "../content";
import { ExamSourcePicker } from "./ExamSourcePicker";
import { PromoCard } from "./PromoCard";
import { PromoDeadlineBanner } from "./PromoDeadlineBanner";
import { SignupGiftBanner } from "./SignupGiftBanner";
import { ValueTrio } from "./ValueTrio";
import { ProNudge } from "@/features/plan/ProNudge";
import { FirstRunChecklist } from "@/features/account/FirstRunChecklist";

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  userName?: string; // đã đăng nhập thì chào tên thay cho slogan
}

// Phần đầu trang: câu hỏi "Bạn đang ôn môn nào?" làm tiêu đề, ba ý ngắn, ô chọn môn (việc chính), thanh dán link FuOverflow (việc phụ), dải quà (khách).
// Phong cách học thuật: nền giấy ấm, màu navy, một điểm nhấn vàng đồng, không chữ chuyển sắc hay hiệu ứng phát sáng.
export function HeroSection({ onPick, onImported, userName }: Props) {
  const isGuest = !userName;

  return (
    <section className="relative isolate shrink-0 border-b border-outline-variant">
      {/* Nền: quầng sáng vàng ở đỉnh và lưới chấm mờ dần xuống dưới, tạo chiều sâu mà không làm rối chữ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-7rem] h-72 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-[#ffc61f]/20 blur-3xl" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(var(--md-sys-color-outline-variant)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_25%,transparent_100%)]" />
      </div>
      <div className={`mx-auto w-full max-w-3xl px-5 pb-10 text-center ${isGuest ? "pt-5 sm:pt-7" : "pt-12 sm:pt-16"}`}>
        <div className="animate-fade-up">
          {isGuest && <p className="md-label-large uppercase tracking-[0.2em] text-primary">{brand.product}</p>}

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

          {isGuest && (
            <>
              <div aria-hidden className="mx-auto mt-4 h-px w-24 bg-primary/40" />
              <p className="md-body-large mx-auto mt-3 max-w-xl text-on-surface-variant">Chọn môn, mở đề là làm ngay. Có đáp án, giải thích từng câu và chấm điểm thang 10.</p>
              <ValueTrio />
            </>
          )}

          {/* Khách: tiêu đề gọn để ưu đãi bên dưới là điểm nhấn đầu tiên */}
          {!isGuest && (
            <>
              <p className="md-body-large mx-auto mt-4 max-w-xl text-on-surface-variant">
                Luyện đề thi FE từ kho đề của {brand.partnerName}, làm bài và nhận điểm thang 10 ngay.
              </p>

              <a
                href={brand.partnerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest py-1 pl-1 pr-3.5 text-xs text-on-surface-variant shadow-m3-1 transition hover:border-primary/50"
              >
                <img src={logos.partner} alt={brand.partnerName} className="h-6 w-6 rounded-full" />
                Kho đề từ <b className="font-semibold text-on-surface">{brand.partnerName}</b>
              </a>
            </>
          )}
        </div>

        {/* Bố cục: ô chọn môn (việc chính, thấy ngay không cần cuộn) → thanh dán link FuOverflow → dải quà → dải Pro → thẻ ưu đãi.
            Không còn chồng/che nhau khi cuộn. */}
        <PromoDeadlineBanner />

        <div className="relative animate-fade-up [animation-delay:60ms]">
          <div className={isGuest ? "mt-3" : ""}>
            <ExamSourcePicker onPick={onPick} onImported={onImported} />
          </div>
        </div>

        {isGuest && <div className="mt-6"><SignupGiftBanner /></div>}

        {!isGuest && <FirstRunChecklist />}

        {/* Khách chưa thử gì thì chưa mời trả tiền: chỉ có dải quà đăng ký. Thành viên thấy lời mời Pro dựa trên dữ kiện thật của họ (hoặc dải Pro thường nếu chưa có). */}
        {!isGuest && <ProNudge />}

        {isGuest && (
          <div className="mt-8 animate-fade-up [animation-delay:120ms]">
            <PromoCard />
          </div>
        )}

        {!isGuest && (
        <ul className="mt-8 hidden flex-wrap items-center justify-center gap-2.5 sm:flex">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest/80 px-3.5 py-1.5 text-sm text-on-surface-variant shadow-m3-1">
              <Icon size={15} className="text-primary" />
              {text}
            </li>
          ))}
        </ul>
        )}
      </div>
    </section>
  );
}
