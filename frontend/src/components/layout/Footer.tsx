import { brand } from "../../config/brand";
import { FacebookIcon } from "../brand/FacebookIcon";
import { Logo } from "../brand/Logo";

interface Props {
  onDark?: boolean;
  className?: string;
}

// Footer dùng chung: thương hiệu, người sáng lập, liên kết Facebook. Thông tin lấy từ brand.config.ts
export function Footer({ className = "" }: Props) {
  const home = brand.companyUrl || brand.facebookUrl;

  return (
    <footer className={`border-t border-slate-200 bg-white ${className}`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <a href={home} target="_blank" rel="noreferrer" className="shrink-0" title={brand.company}>
            <Logo className="h-6" />
          </a>
          <div className="text-xs leading-relaxed text-slate-500">
            <div>
              <span className="font-medium text-slate-700">{brand.product}</span> · Phát triển bởi{" "}
              <a href={home} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                {brand.company}
              </a>
            </div>
            <div>
              Founder: <span className="text-slate-700">{brand.founder}</span> · © {new Date().getFullYear()}{" "}
              {brand.company}
            </div>
          </div>
        </div>

        <a
          href={brand.facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
        >
          <FacebookIcon size={14} />
          Theo dõi trên Facebook
        </a>
      </div>
    </footer>
  );
}
