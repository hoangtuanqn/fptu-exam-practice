import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";

// Khối navy cuối trang mời đăng ký
export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-brand-900 text-white">
      {/* Lưới mờ + ánh sáng xanh/cyan lấy từ gradient của logo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-600/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-5 py-12 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{brand.slogan}</p>
        <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          Sẵn sàng chạm{" "}
          <span className="bg-gradient-to-r from-brand-400 via-accent to-accent-soft bg-clip-text text-transparent">
            điểm 10
          </span>
          ?
        </h2>
        <p className="max-w-md text-sm text-brand-200">
          Tạo tài khoản miễn phí chỉ với email, luyện đề không giới hạn.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="rounded-lg bg-gradient-to-r from-brand-600 to-accent px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:brightness-110"
          >
            Tạo tài khoản miễn phí
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Đăng nhập
          </Link>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-brand-300">
          {["Đăng ký miễn phí", "Chấm điểm thang 10", "AI giải thích đáp án"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-accent" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
