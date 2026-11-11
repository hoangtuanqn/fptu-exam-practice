import type { ImportedExam } from "@/features/exam-import/types";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { brand, logos } from "@/shared/brand/brand";
import { FEATURES, splitSlogan } from "../content";
import { ExamSourcePicker } from "./ExamSourcePicker";
import { PromoCard } from "./PromoCard";
import { SignupGiftBanner } from "./SignupGiftBanner";
import { ValueTrio } from "./ValueTrio";
import { ProTeaser } from "@/features/plan/ProTeaser";
import { FirstRunChecklist } from "@/features/account/FirstRunChecklist";

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  userName?: string; // đã đăng nhập thì chào tên thay cho slogan
}

// Phần đầu trang: tên hệ thống (chữ có chân), khẩu hiệu, thẻ ưu đãi (khách), khối chọn nguồn đề, ba ý ngắn.
// Phong cách học thuật: nền giấy ấm, màu navy, một điểm nhấn vàng đồng, không chữ chuyển sắc hay hiệu ứng phát sáng.
export function HeroSection({ onPick, onImported, userName }: Props) {
  const isGuest = !userName;
  const [sloganLead, sloganAccent] = splitSlogan(brand.slogan);
  // Tên sản phẩm: phần đầu thường, hai từ cuối ("FE FPTU") in nghiêng
  const words = brand.product.split(" ");
  const accentCount = words.length >= 3 ? 2 : 1;
  const titleLead = words.slice(0, -accentCount).join(" ");
  const titleAccent = words.slice(-accentCount).join(" ");

  return (
    <section className="relative isolate shrink-0 border-b border-outline-variant">
      {/* Nền: quầng sáng vàng ở đỉnh và lưới chấm mờ dần xuống dưới, tạo chiều sâu mà không làm rối chữ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-7rem] h-72 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-[#ffc61f]/20 blur-3xl" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(var(--md-sys-color-outline-variant)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_25%,transparent_100%)]" />
      </div>
      <div className={`mx-auto w-full max-w-3xl px-5 pb-10 text-center ${isGuest ? "pt-5 sm:pt-7" : "pt-12 sm:pt-16"}`}>
        <div className="animate-fade-up">
          {isGuest && <p className="md-label-large uppercase tracking-[0.2em] text-primary">Ôn thi FE cho mọi ngành FPTU</p>}

          <h1 className={`md-hero-title text-on-surface ${isGuest ? "mt-2" : "mt-5"}`}>
            {userName ? (
              <>
                Chào <span className="italic text-primary">{userName}</span>, vào luyện thôi
              </>
            ) : (
              <>
                {titleLead && <span>{titleLead} </span>}
                <span className="italic text-primary">{titleAccent}</span>
              </>
            )}
          </h1>

          {isGuest && (
            <>
              <div aria-hidden className="mx-auto mt-4 h-px w-24 bg-primary/40" />
              <p className="md-title-large mt-3 font-normal italic text-on-surface-variant">
                {sloganLead}
                {sloganAccent && <span className="font-semibold not-italic text-on-surface">{sloganAccent}</span>}
              </p>
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

        {/* Bố cục: dải quà mỏng → ô nhập link (hành động chính, thấy ngay không cần cuộn) → dải Pro → thẻ ưu đãi.
            Không còn chồng/che nhau khi cuộn. */}
        {isGuest && <SignupGiftBanner />}

        <div className="relative animate-fade-up [animation-delay:60ms]">
          <div className={isGuest ? "mt-3" : ""}>
            <ExamSourcePicker onPick={onPick} onImported={onImported} />
          </div>
        </div>

        {!isGuest && <FirstRunChecklist />}

        <ProTeaser />

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
