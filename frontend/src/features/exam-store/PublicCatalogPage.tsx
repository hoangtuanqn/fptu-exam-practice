import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useSignupGift } from "@/features/landing/useSignupGift";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { GOLD_BUTTON } from "@/shared/ui/gold";
import { formatCredit } from "@/shared/utils/formatters";
import { trackPrompt } from "@/shared/utils/trackPrompt";
import { catalogApi } from "./catalog.api";
import { CatalogOverview } from "./CatalogOverview";
import { PublicExamList } from "./PublicExamList";
import { SubjectBrowser } from "./SubjectBrowser";

// Kho đề công khai (/kho-de): khách xem toàn bộ môn và đề trước khi đăng ký. Con số là số thật đếm từ danh mục, không phóng đại.
// Chưa chọn môn: tiêu đề, số liệu, ô tìm và lưới mọi môn. Đã chọn môn (?subject=PRO192): danh sách đề của môn đó.
export default function PublicCatalogPage() {
  const { user } = useAuth();
  const [url, setUrl] = useUrlState({ subject: "" });
  const code = url.subject.toUpperCase();
  const subjects = useApi(() => catalogApi.subjects(), []);
  const overview = useApi(() => catalogApi.overview(), []).data;
  useEffect(() => trackPrompt("library-page", "shown"), []);
  const gift = useSignupGift();

  const current = subjects.data?.find((s) => s.code === code);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate border-b border-outline-variant">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-[-7rem] h-64 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-[#ffc61f]/20 blur-3xl" />
            <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(var(--md-sys-color-outline-variant)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_25%,transparent_100%)]" />
          </div>
          <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-10 text-center sm:pt-12">
            {code ? (
              <>
                <button type="button" onClick={() => setUrl({ subject: "" })} className={`${buttonClass({ size: "sm", variant: "text" })} mb-3`}>
                  <ArrowLeft size={15} /> Tất cả môn
                </button>
                <p className="md-label-large uppercase tracking-[0.2em] text-primary">Môn {code}</p>
                <h1 className="md-hero-title mt-2 text-on-surface">{current?.name ?? `Đề thi FE môn ${code}`}</h1>
                {current && <Stats items={[{ icon: BookOpen, text: `${current.total} đề` }]} />}
              </>
            ) : (
              <>
                <p className="md-label-large uppercase tracking-[0.2em] text-primary">Kho đề</p>
                <h1 className="md-hero-title mt-2 text-on-surface">
                  Kho đề thi <span className="italic text-primary">FE</span> của mọi môn
                </h1>
                <p className="md-body-large mx-auto mt-3 max-w-xl text-on-surface-variant">Chọn môn (lọc theo Kỳ 0 đến Kỳ 9) để xem danh sách đề, số credit mở mỗi đề ghi ngay trên nút. Mở đề ra luyện với đáp án, giải thích từng câu và chấm điểm thang 10.</p>
                {!user && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <Link to="/register" className={`md-label-large inline-flex h-11 items-center justify-center rounded-full px-6 transition hover:brightness-105 ${GOLD_BUTTON}`}>
                      Đăng ký miễn phí
                    </Link>
                    {gift.hasGift && <span className="md-body-medium text-on-surface-variant">Tặng {formatCredit(gift.bonus)} khi đăng ký lần đầu</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8">
          {code ? (
            // Thành viên mở đề ngay tại đây (có xác nhận phí); khách chỉ xem rồi đi đăng ký
            user ? (
              <SubjectBrowser />
            ) : (
              <Card>
                <PublicExamList code={code} />
              </Card>
            )
          ) : (
            <CatalogOverview subjects={subjects} overview={overview} onPick={(c) => setUrl({ subject: c })} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Stats({ items }: { items: { icon: typeof BookOpen; text: string }[] }) {
  return (
    <ul className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="md-label-large inline-flex items-center gap-2 rounded-full border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low px-4 py-1.5 text-on-surface shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_18px_-12px_rgba(70,45,0,0.35)]">
          <Icon size={16} className="text-primary" />
          {text}
        </li>
      ))}
    </ul>
  );
}
