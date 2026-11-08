import type { ImportedExam } from "@/features/exam-import/types";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { brand, logos } from "@/shared/brand/brand";
import { FEATURES, splitSlogan } from "../content";
import { ExamSourcePicker } from "./ExamSourcePicker";
import { PromoCard } from "./PromoCard";
import { ProTeaser } from "@/features/plan/ProTeaser";
import { useScrollOverlap } from "../useScrollOverlap";

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
  // Hiệu ứng xấp thẻ (khách, màn rộng): kéo xuống thì ô nhập đề trượt lên chồng thẻ ưu đãi, chừa lại dòng quà đăng ký ở đầu thẻ
  const { under, over } = useScrollOverlap(isGuest);

  return (
    <section className="relative isolate shrink-0 border-b border-outline-variant">
      <div className={`mx-auto w-full max-w-3xl px-5 pb-14 text-center ${isGuest ? "pt-8 sm:pt-12" : "pt-12 sm:pt-16"}`}>
        <div className="animate-fade-up">
          {isGuest && <p className="md-label-large uppercase tracking-[0.3em] text-primary">Hệ thống ôn thi</p>}

          <h1 className={`md-hero-title text-on-surface ${isGuest ? "mt-3" : "mt-5"}`}>
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
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-surface-container-lowest py-1 pl-1 pr-3.5 text-xs text-slate-600 transition hover:border-brand-300"
              >
                <img src={logos.partner} alt={brand.partnerName} className="h-6 w-6 rounded-full" />
                Kho đề từ <b className="font-semibold text-slate-800">{brand.partnerName}</b>
              </a>
            </>
          )}
        </div>

        {/* Ưu đãi đặt ngay đầu trang để khách thấy liền, không phải cuộn */}
        {isGuest && (
          <div className="relative z-0 mt-7 animate-fade-up [animation-delay:60ms]">
            <div ref={under} className="origin-bottom-left will-change-transform">
              <PromoCard />
            </div>
          </div>
        )}

        <div className="relative z-10 animate-fade-up [animation-delay:120ms]">
          <div ref={isGuest ? over : undefined} className="will-change-transform">
            <ExamSourcePicker onPick={onPick} onImported={onImported} />
          </div>
        </div>

        <ProTeaser />

        <ul className="mt-8 hidden flex-wrap items-center justify-center gap-2.5 sm:flex">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-surface-container-lowest/70 px-3.5 py-1.5 text-sm text-slate-600">
              <Icon size={15} className="text-brand-700" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
