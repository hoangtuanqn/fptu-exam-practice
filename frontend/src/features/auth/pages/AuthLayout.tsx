import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Logo } from "@/shared/brand/Logo";
import { Footer } from "@/shared/layout/Footer";
import { brand } from "@/shared/brand/brand";

const POINTS = [
  "Nhập đề từ link FuOverflow, lưu vào thư viện riêng",
  "Luyện tập hoặc thi thử, chấm điểm thang 10",
  "Xem lại lịch sử từng lần làm, từng câu",
];

// Khung chung cho đăng nhập/đăng ký: bên trái giới thiệu thương hiệu (ẩn trên điện thoại), bên phải là form
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-surface-container-lowest lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200/70 bg-gradient-to-br from-brand-50 via-surface-container-lowest to-surface-container-lowest p-12 lg:flex">
        <div aria-hidden className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_80%_60%_at_30%_0%,#000_20%,transparent_100%)]" />
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent-soft/50 blur-3xl" />

        <Link to="/" className="relative w-fit" aria-label="Trang chủ" title="Trang chủ">
          <Logo variant="full" className="h-20" />
        </Link>

        <div className="relative">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{brand.tagline}</p>
          <h2 className="max-w-sm text-3xl font-semibold leading-snug text-slate-900">
            {brand.product}: ôn đều đặn, <span className="text-gradient">theo dõi tiến bộ</span> từng ngày.
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-slate-600">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                  <Check size={12} strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">Phát triển bởi {brand.company}</p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm animate-fade-up">
            <Link to="/" className="mb-8 block w-fit lg:hidden" aria-label="Trang chủ" title="Trang chủ">
              <Logo className="h-9" />
            </Link>

            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
