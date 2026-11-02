import { brand } from "../../config/brand";
import { FacebookIcon } from "../brand/FacebookIcon";
import { Logo } from "../brand/Logo";

// Footer gọn một hàng: logo + thông tin nhóm bên trái, nút Facebook bên phải. Dữ liệu lấy từ brand.config.ts
export function Footer() {
  const home = brand.companyUrl || brand.facebookUrl;
  const team = [`Founder: ${brand.founder}`, brand.coFounders.length ? `Co-Founder: ${brand.coFounders.join(", ")}` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white">
      <div className="h-px bg-gradient-to-r from-brand-600 via-accent to-transparent" />
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <a href={home} target="_blank" rel="noreferrer" title={brand.company} className="shrink-0">
            <Logo className="h-7" />
          </a>
          <span className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="text-xs leading-relaxed text-slate-500">
            <div>
              <span className="font-medium text-slate-700">{brand.product}</span> · Phát triển bởi{" "}
              <a href={home} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                {brand.company}
              </a>
            </div>
            <div>{team}</div>
          </div>
        </div>

        <a
          href={brand.facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-brand-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-700"
        >
          <FacebookIcon size={14} />
          Theo dõi trên Facebook
        </a>
      </div>
    </footer>
  );
}
