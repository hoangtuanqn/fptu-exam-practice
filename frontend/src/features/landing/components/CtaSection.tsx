import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";
import { buttonClass } from "@/shared/ui/Button";

// Khối cuối trang mời đăng ký: thẻ sáng bo tròn lớn, quầng sáng xanh/cyan rất nhạt
export function CtaSection() {
  return (
    <section className="bg-white px-5 py-10 sm:py-16">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-b from-brand-50 to-white px-4 py-10 text-center sm:px-6 sm:py-14 shadow-card">
        <div aria-hidden className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,#000_20%,transparent_100%)]" />
        <div aria-hidden className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-brand-200/50 blur-3xl" />
        <div aria-hidden className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-accent-soft/50 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{brand.slogan}</p>
          <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Sẵn sàng chạm <span className="text-gradient">điểm 10</span>?
          </h2>
          <p className="max-w-md text-sm text-slate-600">Tạo tài khoản miễn phí chỉ với email, luyện đề không giới hạn.</p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className={buttonClass({ variant: "primary", className: "!px-6 !py-3" })}>
              Tạo tài khoản miễn phí
            </Link>
            <Link to="/login" className={buttonClass({ className: "!px-6 !py-3" })}>
              Đăng nhập
            </Link>
          </div>

          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-500">
            {["Đăng ký miễn phí", "Chấm điểm thang 10", "Lưu lịch sử từng lần làm"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
