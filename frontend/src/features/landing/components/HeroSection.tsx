import type { PickFolder } from "@/features/practice/components/FolderInput";
import { brand, logos } from "@/shared/brand/brand";
import { FEATURES, splitSlogan } from "../content";
import { DropZone } from "./DropZone";

interface Props {
  onPick: PickFolder;
  userName?: string; // đã đăng nhập thì chào tên thay cho slogan
  trialUsed: boolean; // khách đã dùng hết lượt thử thì ẩn nhãn "dùng thử"
}

// Phần đầu trang: nhãn dùng thử, tên hệ thống, slogan, chip đối tác, vùng thả thư mục, ba ý ngắn
export function HeroSection({ onPick, userName, trialUsed }: Props) {
  const isGuest = !userName;
  const [sloganLead, sloganAccent] = splitSlogan(brand.slogan);

  return (
    <section className="bg-white">
      <div className="h-1 bg-gradient-to-r from-brand-600 via-accent to-accent-soft" />
      <div className="mx-auto w-full max-w-2xl px-5 py-8 text-center sm:py-10">
        {isGuest && !trialUsed && (
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Dùng thử miễn phí 1 lần, không cần đăng ký
          </span>
        )}
        <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          {userName ? `Chào ${userName}, vào luyện thôi` : brand.product}
        </h1>
        {isGuest && (
          <p className="mt-3 font-serif text-xl font-medium text-brand-600 sm:text-2xl">
            {sloganLead}
            {sloganAccent && <span className="font-semibold text-brand-900">{sloganAccent}</span>}
          </p>
        )}
        <p className="mt-3 text-base font-medium text-slate-800">Luyện đề ngay để nắm chắc 9+ trong tay.</p>
        <p className="mt-2 text-sm text-slate-600">
          Luyện đề thi FE từ kho đề của {brand.partnerName}, làm bài và nhận điểm thang 10 ngay.
        </p>
        <a
          href={brand.partnerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs text-slate-600 transition hover:border-brand-300"
        >
          <img src={logos.partner} alt={brand.partnerName} className="h-6 w-6 rounded-full" />
          Kho đề từ <b className="font-semibold text-slate-800">{brand.partnerName}</b>
        </a>

        <DropZone onPick={onPick} />

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-2">
              <Icon size={16} className="text-brand-600" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
