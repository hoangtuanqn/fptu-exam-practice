import { Link, useSearchParams } from "react-router-dom";
import { Bug, Download, Rocket, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ExtensionDownloadButton } from "@/features/landing/components/ExtensionDownloadButton";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { Footer } from "@/shared/layout/Footer";
import { UserMenu } from "@/shared/layout/UserMenu";
import { Card } from "@/shared/ui/Card";
import { Segmented } from "@/shared/ui/Segmented";
import { formatDate } from "@/shared/utils/formatters";
import { APP_VERSION, CHANGE_LABEL, CHANGELOG, EXTENSION_VERSION, type ChangeType, type Product, type Release } from "./changelog";

const TYPE_STYLE: Record<ChangeType, { icon: LucideIcon; chip: string }> = {
  new: { icon: Sparkles, chip: "bg-primary-container text-on-primary-container" },
  improved: { icon: Zap, chip: "bg-secondary-container text-on-secondary-container" },
  fixed: { icon: Bug, chip: "bg-surface-container-highest text-on-surface-variant" },
};

const GROUP_ORDER: ChangeType[] = ["new", "improved", "fixed"];

// Một phiên bản: số phiên bản + ngày + tên, rồi các thay đổi gom theo loại (Mới / Cải thiện / Sửa lỗi)
function ReleaseCard({ release, latest }: { release: Release; latest: boolean }) {
  return (
    <li id={`v${release.version}`} className="relative pl-8 sm:pl-10">
      <span aria-hidden className={`absolute left-0 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface ${latest ? "bg-primary" : "bg-outline-variant"}`}>
        {latest && <Rocket size={10} className="text-on-primary" />}
      </span>
      <Card variant={latest ? "elevated" : "outlined"} className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="md-title-large text-on-surface">v{release.version}</h2>
          {latest && <span className="md-label-small rounded-full bg-primary px-2.5 py-1 text-on-primary">Mới nhất</span>}
          <time dateTime={release.date} className="md-body-small ml-auto text-on-surface-variant">
            {formatDate(release.date)}
          </time>
        </div>
        <p className="md-title-small mt-1 text-on-surface-variant">{release.title}</p>

        <div className="mt-4 space-y-4">
          {GROUP_ORDER.map((type) => {
            const items = release.changes.filter((c) => c.type === type);
            if (items.length === 0) return null;
            const { icon: Icon, chip } = TYPE_STYLE[type];
            return (
              <section key={type}>
                <span className={`md-label-medium inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${chip}`}>
                  <Icon size={13} /> {CHANGE_LABEL[type]}
                </span>
                <ul className="md-body-medium mt-2 space-y-1.5 text-on-surface">
                  {items.map((c) => (
                    <li key={c.text} className="flex items-start gap-2.5">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-outline" />
                      {c.text}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Card>
    </li>
  );
}

// /changelog (công khai): lịch sử thay đổi của web và tiện ích Chrome, bản mới nhất ở trên cùng
export default function ChangelogPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Product = params.get("tab") === "extension" ? "extension" : "web";
  const releases = CHANGELOG[tab];
  const current = tab === "web" ? APP_VERSION : EXTENSION_VERSION;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface/90 px-3 backdrop-blur sm:px-4">
        <Link to="/" title={brand.company}>
          <Logo variant="full" className="h-10" />
        </Link>
        <UserMenu />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8">
        <div className="text-center">
          <h1 className="md-headline-medium text-on-surface">Có gì mới</h1>
          <p className="md-body-medium mt-1 text-on-surface-variant">
            {tab === "web" ? "FEPass" : "Tiện ích Chrome"} đang ở phiên bản <b className="text-on-surface">v{current}</b>. Mọi thay đổi đều được ghi lại ở đây.
          </p>
          <div className="mt-4 flex justify-center">
            <Segmented
              label="Chọn sản phẩm"
              value={tab}
              options={[
                { value: "web", label: "Website" },
                { value: "extension", label: "Tiện ích Chrome" },
              ]}
              onChange={(v) => setParams(v === "web" ? {} : { tab: v }, { replace: true })}
            />
          </div>
          {tab === "extension" &&
            (user ? (
              <ExtensionDownloadButton className="md-label-large md-state md-motion mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-on-primary disabled:opacity-60">Tải tiện ích v{EXTENSION_VERSION}</ExtensionDownloadButton>
            ) : (
              <Link to="/login" className="md-label-large md-state md-motion mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-on-primary">
                <Download size={16} /> Đăng nhập để tải tiện ích v{EXTENSION_VERSION}
              </Link>
            ))}
        </div>

        <div className="relative mt-8">
          <span aria-hidden className="absolute bottom-2 left-[9px] top-4 w-0.5 bg-outline-variant" />
          <ol className="space-y-5">
            {releases.map((r, i) => (
              <ReleaseCard key={r.version} release={r} latest={i === 0} />
            ))}
          </ol>
        </div>
      </main>

      <Footer />
    </div>
  );
}
