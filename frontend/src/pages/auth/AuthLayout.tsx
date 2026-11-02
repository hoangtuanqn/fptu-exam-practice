import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/brand/Logo";
import { Footer } from "../../components/layout/Footer";
import { brand } from "../../config/brand";

const POINTS = [
  "Luyện theo chế độ luyện tập hoặc thi thử",
  "Chấm điểm thang 10 tự động",
  "Nạp tiền nhanh qua chuyển khoản",
];

// Khung chung cho đăng nhập/đăng ký: bên trái giới thiệu thương hiệu (ẩn trên điện thoại), bên phải là form
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        {/* Ánh sáng xanh lấy từ dải gradient của logo */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

        <Link to="/" className="relative w-fit">
          <Logo variant="full" onDark className="h-24" />
        </Link>

        <div className="relative">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-accent">{brand.tagline}</p>
          <h2 className="max-w-sm font-serif text-3xl font-semibold leading-snug">
            {brand.product}: ôn đều đặn, theo dõi tiến bộ từng ngày.
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-brand-100">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="h-px w-5 bg-accent" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-300">Phát triển bởi {brand.company}</p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-8 block w-fit lg:hidden">
              <Logo className="h-9" />
            </Link>

            <h1 className="font-serif text-3xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
