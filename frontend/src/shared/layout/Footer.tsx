import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { useSeason } from "@/shared/season/SeasonContext";
import { XmasTree } from "@/shared/season/XmasArt";
import { Switch } from "@/shared/ui/Switch";
import { APP_VERSION } from "@/features/changelog/changelog";
import { brand } from "@/shared/brand/brand";
import { FacebookIcon } from "@/shared/brand/FacebookIcon";
import { Logo } from "@/shared/brand/Logo";

const linkClass = "font-medium text-primary hover:underline";
const LEGAL_LINKS = [
  { to: "/dieu-khoan", label: "Điều khoản" },
  { to: "/bao-mat", label: "Bảo mật" },
  { to: "/thanh-toan-hoan-tien", label: "Hoàn tiền" },
];

// Footer: hàng trên (logo + đội ngũ | liên kết nhanh + Facebook), dải dưới (bản quyền + điều khoản, bảo mật, hoàn tiền). Dữ liệu từ brand.config.ts
export function Footer() {
  const home = brand.companyUrl || brand.facebookUrl;
  const { xmas, decor, setDecor, showDecor } = useSeason();
  const facebook = (
    <a
      href={brand.facebookUrl}
      target="_blank"
      rel="noreferrer"
      className="md-state md-motion md-label-large relative inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-full border border-outline px-4 text-primary after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
    >
      <FacebookIcon size={14} />
      Facebook
    </a>
  );

  return (
    <footer className={`mt-auto shrink-0 border-t border-outline-variant bg-surface-container-low${showDecor ? " xmas-snowcap" : ""}`}>
      {/* sm:pr-28: chừa chỗ cho linh vật trợ lý nổi ở góc phải dưới để không che nút Facebook */}
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 sm:pr-28 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <a href={home} target="_blank" rel="noreferrer" title={brand.company} className="shrink-0">
            <Logo className="h-8 sm:h-10" />
          </a>
          {showDecor && <XmasTree className="h-8 w-auto shrink-0 sm:h-10" />}
          <div className="md-body-small text-on-surface-variant">
            <div className="md-title-small text-on-surface">{brand.product}</div>
            <div>
              Phát triển bởi{" "}
              <a href={home} target="_blank" rel="noreferrer" className={linkClass}>
                {brand.company}
              </a>
            </div>
            <div>
              Founder: {brand.founder}
              {brand.coFounders.length > 0 && <> · Co-Founder: {brand.coFounders.join(", ")}</>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <nav aria-label="Liên kết nhanh" className="md-body-small flex flex-col gap-1">
            <Link to="/features" className={linkClass}>
              Tính năng
            </Link>
            <Link to="/changelog" className={linkClass}>
              Phiên bản v{APP_VERSION} · Có gì mới
            </Link>
          </nav>
          {facebook}
          {xmas && (
            // Một công tắc tắt mọi trang trí mùa (tuyết, dây đèn, cây thông...)
            <div className="md-label-large flex items-center gap-3 text-on-surface-variant">
              <Snowflake size={14} aria-hidden />
              <span aria-hidden>Trang trí Giáng sinh</span>
              <Switch checked={decor} onChange={setDecor} label="Trang trí Giáng sinh" />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-outline-variant/60">
        <div className="md-body-small mx-auto flex max-w-5xl flex-col gap-1.5 px-4 py-3 text-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pr-28">
          <span>
            © {new Date().getFullYear()} {brand.product}
          </span>
          <nav aria-label="Chính sách" className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-primary hover:underline">
                {l.label}
              </Link>
            ))}
            <a href={`mailto:${brand.contactEmail}`} className="hover:text-primary hover:underline">
              Liên hệ
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
