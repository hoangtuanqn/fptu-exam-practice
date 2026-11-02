import type { ReactNode } from "react";
import { brand } from "../../config/brand";
import { FacebookIcon } from "../brand/FacebookIcon";
import { Logo } from "../brand/Logo";

function Person({ role, children }: { role: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-accent">{role}</div>
      <div className="mt-1 text-sm text-white">{children}</div>
    </div>
  );
}

// Footer dùng chung (nền navy theo màu logo). Mọi thông tin lấy từ brand.config.ts
export function Footer() {
  const home = brand.companyUrl || brand.facebookUrl;
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-brand-900 text-brand-200">
      {/* Đường gradient xanh → cyan lấy từ logo */}
      <div className="h-0.5 bg-gradient-to-r from-brand-600 via-accent to-transparent" />
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-brand-600/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-5xl gap-8 px-5 py-8 md:grid-cols-[1.4fr_1fr_auto] md:items-start">
        <div>
          <a href={home} target="_blank" rel="noreferrer" title={brand.company} className="inline-block">
            <Logo variant="full" onDark className="h-14" />
          </a>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-brand-300">
            <span className="font-medium text-white">{brand.product}</span>: làm đề trắc nghiệm, chấm điểm thang 10, theo
            dõi tiến bộ mỗi ngày.
          </p>
        </div>

        <div className="space-y-4">
          <Person role="Founder">{brand.founder}</Person>
          {brand.coFounders.length > 0 && <Person role="Co-Founder">{brand.coFounders.join(" · ")}</Person>}
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-accent">Liên hệ</div>
          <a
            href={brand.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <FacebookIcon size={16} />
            Facebook MST Software
          </a>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-5 py-3 text-xs text-brand-300 sm:flex-row sm:justify-between">
          <span>
            © {year} {brand.company}. Bảo lưu mọi quyền.
          </span>
          <span>{brand.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
