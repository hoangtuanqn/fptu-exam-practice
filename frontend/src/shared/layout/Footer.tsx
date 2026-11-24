import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { useSeason } from "@/shared/season/SeasonContext";
import { XmasTree } from "@/shared/season/XmasArt";
import { Switch } from "@/shared/ui/Switch";
import { APP_VERSION } from "@/features/changelog/changelog";
import { brand } from "@/shared/brand/brand";
import { FacebookIcon } from "@/shared/brand/FacebookIcon";
import { Logo } from "@/shared/brand/Logo";

// Footer gọn một hàng có đệm rộng: logo + tên | đội ngũ | Facebook. Dữ liệu từ brand.config.ts
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
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:px-6 sm:pr-28 sm:py-6 sm:items-center sm:justify-between sm:gap-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href={home}
            target="_blank"
            rel="noreferrer"
            title={brand.company}
            className="shrink-0"
          >
            <Logo className="h-6 sm:h-8" />
          </a>
          {showDecor && <XmasTree className="h-8 w-auto shrink-0 sm:h-10" />}
          <div className="md-body-small text-on-surface-variant">
            <div>
              <span className="font-medium text-on-surface">
                {brand.product}
              </span>{" "}
              · Phát triển bởi{" "}
              <a
                href={home}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {brand.company}
              </a>
            </div>
            <div>
              <Link
                to="/features"
                className="font-medium text-primary hover:underline"
              >
                Tính năng
              </Link>
              {" · "}
              <Link
                to="/changelog"
                className="font-medium text-primary hover:underline"
              >
                Phiên bản v{APP_VERSION} · Có gì mới
              </Link>
            </div>
            <div>
              Founder: {brand.founder}
              {brand.coFounders.length > 0 && (
                <> · Co-Founder: {brand.coFounders.join(", ")}</>
              )}
            </div>
          </div>
        </div>

        {xmas ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {facebook}
            {/* Một công tắc tắt mọi trang trí mùa (tuyết, dây đèn, cây thông...) */}
            <div className="md-label-large flex items-center gap-3 text-on-surface-variant">
              <Snowflake size={14} aria-hidden />
              <span aria-hidden>Trang trí Giáng sinh</span>
              <Switch checked={decor} onChange={setDecor} label="Trang trí Giáng sinh" />
            </div>
          </div>
        ) : (
          facebook
        )}
      </div>
    </footer>
  );
}
