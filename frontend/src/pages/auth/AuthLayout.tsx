import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";

const POINTS = ["Luyện theo chế độ luyện tập hoặc thi thử", "Chấm điểm thang 10 tự động", "Nạp tiền nhanh qua chuyển khoản"];

// Khung chung cho đăng nhập/đăng ký: bên trái giới thiệu ngắn (ẩn trên điện thoại), bên phải là form
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <BookOpenCheck size={18} />
          </span>
          <span className="font-serif text-xl font-semibold">Luyện đề</span>
        </Link>

        <div>
          <h2 className="max-w-sm font-serif text-3xl font-semibold leading-snug">
            Ôn thi đều đặn, theo dõi tiến bộ từng ngày.
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-brand-100">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="h-px w-5 bg-brand-300" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-brand-300">© {new Date().getFullYear()} Luyện đề</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-white">
              <BookOpenCheck size={16} />
            </span>
            <span className="font-serif text-lg font-semibold text-slate-900">Luyện đề</span>
          </Link>

          <h1 className="font-serif text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
