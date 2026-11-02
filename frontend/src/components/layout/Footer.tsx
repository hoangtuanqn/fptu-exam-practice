import type { ReactNode } from "react";
import { brand } from "../../config/brand";
import { FacebookIcon } from "../brand/FacebookIcon";
import { Logo } from "../brand/Logo";

function Label({ children }: { children: ReactNode }) {
  return <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{children}</div>;
}

// Footer 3 cột: thương hiệu | đội ngũ | liên hệ, dưới cùng là dòng bản quyền. Dữ liệu từ brand.config.ts
export function Footer() {
  const home = brand.companyUrl || brand.facebookUrl;

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white">
      <div className="h-px bg-gradient-to-r from-brand-600 via-accent to-transparent" />
      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-5 sm:grid-cols-[1.2fr_1.3fr_auto] sm:items-center sm:gap-8">
        <div className="flex items-center gap-3">
          <a href={home} target="_blank" rel="noreferrer" title={brand.company} className="shrink-0">
            <Logo className="h-8" />
          </a>
          <div className="text-xs leading-relaxed text-slate-500">
            <div className="font-medium text-slate-800">{brand.product}</div>
            <div>
              Phát triển bởi{" "}
              <a href={home} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                {brand.company}
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs text-slate-700 sm:border-l sm:border-slate-200 sm:pl-8">
          <div>
            <Label>Founder</Label>
            <div className="mt-0.5">{brand.founder}</div>
          </div>
          {brand.coFounders.length > 0 && (
            <div>
              <Label>Co-Founder</Label>
              <div className="mt-0.5">{brand.coFounders.join(", ")}</div>
            </div>
          )}
        </div>

        <a
          href={brand.facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-700"
        >
          <FacebookIcon size={14} />
          Facebook
        </a>
      </div>
      <div className="border-t border-slate-100 py-2 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} {brand.company} · {brand.tagline}
      </div>
    </footer>
  );
}
