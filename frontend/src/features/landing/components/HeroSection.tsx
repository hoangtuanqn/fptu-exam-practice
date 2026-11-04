import type { ImportedExam } from "@/features/exam-import/types";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { brand, logos } from "@/shared/brand/brand";
import { FEATURES, splitSlogan } from "../content";
import { ExamSourcePicker } from "./ExamSourcePicker";
import { PromoCard } from "./PromoCard";
import { useScrollOverlap } from "../useScrollOverlap";

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  userName?: string; // đã đăng nhập thì chào tên thay cho slogan
}

// Phần đầu trang: nhãn dùng thử, tên hệ thống, slogan, chip đối tác, khối chọn nguồn đề, ba ý ngắn
export function HeroSection({ onPick, onImported, userName }: Props) {
  const isGuest = !userName;
  const [sloganLead, sloganAccent] = splitSlogan(brand.slogan);
  const { under, over } = useScrollOverlap(); // kéo xuống: ô nhập đề trượt lên chồng một phần lên thẻ ưu đãi (PC)

  return (
    <section className="relative isolate shrink-0 overflow-hidden">
      {/* Nền: lưới chấm mờ dần ra rìa + hai quầng sáng xanh/cyan rất nhạt lấy từ gradient của logo */}
      <div
        aria-hidden
        className="bg-dots absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_30%,transparent_100%)]"
      />
      <div aria-hidden className="absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
      <div aria-hidden className="absolute -right-24 top-10 -z-10 h-72 w-72 rounded-full bg-accent-soft/40 blur-3xl" />

      <div className={`mx-auto w-full max-w-3xl px-5 pb-14 text-center ${isGuest ? "pt-8 sm:pt-12" : "pt-12 sm:pt-16"}`}>
        <div className="animate-fade-up">

          <h1 className={`font-semibold leading-[1.1] text-slate-900 ${isGuest ? "text-2xl sm:text-4xl" : "mt-5 text-4xl sm:text-6xl"}`}>
            {userName ? (
              <>
                Chào <span className="text-gradient">{userName}</span>, vào luyện thôi
              </>
            ) : (
              brand.product
            )}
          </h1>

          {isGuest && (
            <p className="mt-2 text-base font-medium text-slate-500 sm:text-xl">
              {sloganLead}
              {sloganAccent && <span className="text-gradient font-semibold">{sloganAccent}</span>}
            </p>
          )}

          {/* Khách: tiêu đề gọn để ưu đãi bên dưới là điểm nhấn đầu tiên */}
          {!isGuest && (
            <>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
                Luyện đề thi FE từ kho đề của {brand.partnerName}, làm bài và nhận điểm thang 10 ngay.
              </p>

              <a
                href={brand.partnerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3.5 text-xs text-slate-600 shadow-soft transition hover:border-brand-300"
              >
                <img src={logos.partner} alt={brand.partnerName} className="h-6 w-6 rounded-full" />
                Kho đề từ <b className="font-semibold text-slate-800">{brand.partnerName}</b>
              </a>
            </>
          )}
        </div>

        {/* Ưu đãi đặt ngay đầu trang để khách thấy liền, không phải cuộn */}
        {isGuest && (
          <div className="relative z-0 mt-6 animate-fade-up [animation-delay:60ms]">
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

        <ul className="mt-8 hidden flex-wrap items-center justify-center gap-2.5 sm:flex">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-sm text-slate-600"
            >
              <Icon size={15} className="text-brand-600" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
