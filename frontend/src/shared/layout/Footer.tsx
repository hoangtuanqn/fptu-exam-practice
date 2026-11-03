import { brand } from "@/shared/brand/brand";
import { FacebookIcon } from "@/shared/brand/FacebookIcon";
import { Logo } from "@/shared/brand/Logo";

// Footer gọn một hàng có đệm rộng: logo + tên | đội ngũ | Facebook. Dữ liệu từ brand.config.ts
export function Footer() {
  const home = brand.companyUrl || brand.facebookUrl;

  return (
    <footer className="shrink-0 border-t border-slate-200/70 bg-white/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex items-center gap-4">
          <a href={home} target="_blank" rel="noreferrer" title={brand.company} className="shrink-0">
            <Logo className="h-8" />
          </a>
          <div className="text-xs leading-relaxed text-slate-500">
            <div>
              <span className="font-medium text-slate-800">{brand.product}</span> · Phát triển bởi{" "}
              <a href={home} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                {brand.company}
              </a>
            </div>
            <div>
              Founder: {brand.founder}
              {brand.coFounders.length > 0 && <> · Co-Founder: {brand.coFounders.join(", ")}</>}
            </div>
          </div>
        </div>

        <a
          href={brand.facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-soft transition hover:border-brand-300 hover:text-brand-700"
        >
          <FacebookIcon size={14} />
          Facebook
        </a>
      </div>
    </footer>
  );
}
