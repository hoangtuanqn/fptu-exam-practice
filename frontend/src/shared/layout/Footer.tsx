import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { useSeason } from "@/shared/season/SeasonContext";
import { XmasTree } from "@/shared/season/XmasArt";
import { Switch } from "@/shared/ui/Switch";
import { APP_VERSION } from "@/features/changelog/changelog";
import { brand } from "@/shared/brand/brand";
import { FacebookIcon } from "@/shared/brand/FacebookIcon";
import { Logo } from "@/shared/brand/Logo";

const linkClass = "md-motion hover:text-primary hover:underline";
const PRODUCT_LINKS = [
  { to: "/kho-de", label: "Kho đề" },
  { to: "/features", label: "Tính năng" },
  { to: "/pro", label: "Gói Pro" },
  { to: "/changelog", label: `Có gì mới (v${APP_VERSION})` },
];
const LEGAL_LINKS = [
  { to: "/dieu-khoan", label: "Điều khoản" },
  { to: "/bao-mat", label: "Bảo mật" },
  { to: "/thanh-toan-hoan-tien", label: "Hoàn tiền" },
];

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="md-label-large text-on-surface">{title}</h2>
      <div className="md-body-medium mt-3 flex flex-col gap-2 text-on-surface-variant">{children}</div>
    </div>
  );
}

// Footer: 3 cột (thương hiệu | sản phẩm | đội ngũ) và một dải dưới (bản quyền, công tắc trang trí mùa, điều khoản). Dữ liệu từ brand.config.ts
export function Footer() {
  const home = brand.companyUrl || brand.facebookUrl;
  const { xmas, decor, setDecor, showDecor } = useSeason();

  return (
    <footer className={`mt-auto shrink-0 border-t border-outline-variant bg-surface-container-low${showDecor ? " xmas-snowcap" : ""}`}>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:grid-cols-[1.5fr_1fr_1.2fr] sm:gap-10 sm:px-6 sm:py-10">
        <div>
          <div className="flex items-center gap-3">
            <a href={home} target="_blank" rel="noreferrer" title={brand.company} className="shrink-0">
              <Logo className="h-10" />
            </a>
            {showDecor && <XmasTree className="h-10 w-auto shrink-0" />}
          </div>
          <div className="md-title-medium mt-3 text-on-surface">{brand.product}</div>
          <p className="md-body-medium mt-1 max-w-xs text-on-surface-variant">{brand.slogan}</p>
          <a
            href={brand.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="md-state md-motion md-label-large mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-outline px-4 text-primary"
          >
            <FacebookIcon size={14} />
            Facebook
          </a>
        </div>

        <Column title="Sản phẩm">
          {PRODUCT_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </Link>
          ))}
        </Column>

        <Column title="Đội ngũ">
          <div>
            Phát triển bởi{" "}
            <a href={home} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
              {brand.company}
            </a>
          </div>
          <div>Founder: {brand.founder}</div>
          {brand.coFounders.length > 0 && <div>Co-Founder: {brand.coFounders.join(", ")}</div>}
          <a href={`mailto:${brand.contactEmail}`} className={linkClass}>
            {brand.contactEmail}
          </a>
        </Column>
      </div>

      {/* sm:pr-28: chừa chỗ cho linh vật trợ lý nổi ở góc phải dưới */}
      <div className="border-t border-outline-variant">
        <div className="md-body-small mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4 text-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pr-28">
          <span>
            © {new Date().getFullYear()} {brand.product} · {brand.company}
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {xmas && (
              // Một công tắc tắt mọi trang trí mùa (tuyết, dây đèn, cây thông...)
              <div className="flex items-center gap-2">
                <Snowflake size={14} aria-hidden />
                <span aria-hidden>Trang trí Giáng sinh</span>
                <Switch checked={decor} onChange={setDecor} label="Trang trí Giáng sinh" />
              </div>
            )}
            <nav aria-label="Chính sách" className="flex flex-wrap gap-x-5 gap-y-1">
              {LEGAL_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
