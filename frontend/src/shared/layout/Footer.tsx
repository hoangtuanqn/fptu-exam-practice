import { brand } from "@/shared/brand/brand";
import { FacebookIcon } from "@/shared/brand/FacebookIcon";
import { Logo } from "@/shared/brand/Logo";

// Footer gọn một hàng có đệm rộng: logo + tên | đội ngũ | Facebook. Dữ liệu từ brand.config.ts
export function Footer() {
  const home = brand.companyUrl || brand.facebookUrl;

  return (
    <footer className="mt-auto shrink-0 border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:px-6 sm:py-6 sm:items-center sm:justify-between sm:gap-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <a href={home} target="_blank" rel="noreferrer" title={brand.company} className="shrink-0">
            <Logo className="h-6 sm:h-8" />
          </a>
          <div className="md-body-small text-on-surface-variant">
            <div>
              <span className="font-medium text-on-surface">{brand.product}</span> · Phát triển bởi{" "}
              <a href={home} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
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
          className="md-state md-motion md-label-large relative inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-full border border-outline px-4 text-primary after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
        >
          <FacebookIcon size={14} />
          Facebook
        </a>
      </div>
    </footer>
  );
}
