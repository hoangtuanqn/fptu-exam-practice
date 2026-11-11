import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useSignupGift } from "@/features/landing/useSignupGift";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { useApi } from "@/shared/hooks/useApi";
import { buttonClass } from "@/shared/ui/Button";
import { formatCredit } from "@/shared/utils/formatters";
import { catalogApi } from "./catalog.api";
import { PublicSubjectBrowser } from "./PublicSubjectBrowser";

// Kho đề công khai (/kho-de): khách xem toàn bộ môn và đề trước khi đăng ký. Con số là số thật đếm từ danh mục, không phóng đại.
export default function PublicCatalogPage() {
  const { user } = useAuth();
  const subjects = useApi(() => catalogApi.subjects(), []);
  const gift = useSignupGift();

  const totals = useMemo(() => {
    const data = subjects.data ?? [];
    return { exams: data.reduce((n, s) => n + s.total, 0), subjects: data.length };
  }, [subjects.data]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="md-label-large text-primary">Kho đề</p>
        <h1 className="md-headline-large mt-1 text-on-surface">Kho đề thi FE của mọi môn</h1>
        <p className="md-body-large mt-3 text-on-surface-variant">
          {totals.exams > 0
            ? `Xem ${totals.exams.toLocaleString("vi-VN")} đề thuộc ${totals.subjects} môn. Chọn môn để xem danh sách đề, đăng ký rồi mở đề ra luyện.`
            : "Chọn môn để xem danh sách đề FE, đăng ký rồi mở đề ra luyện."}
        </p>
        {!user && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link to="/register" className={buttonClass({ variant: "primary" })}>
              Đăng ký miễn phí
            </Link>
            {gift.hasGift && <span className="md-body-medium text-on-surface-variant">Tặng {formatCredit(gift.bonus)} khi đăng ký lần đầu</span>}
          </div>
        )}

        <div className="mt-8">
          <PublicSubjectBrowser subjects={subjects} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
