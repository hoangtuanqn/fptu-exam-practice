import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";

// Khối cuối trang mời đăng ký: gọn, chữ có chân, nút navy đặc
export function CtaSection() {
  return (
    <section className="bg-white px-5 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-700">{brand.slogan}</p>
        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-brand-900 sm:text-4xl">
          Sẵn sàng chạm <span className="italic text-brand-700">điểm 10</span>?
        </h2>
        <div aria-hidden className="mx-auto mt-4 h-px w-20 bg-brand-400" />
        <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">Tạo tài khoản miễn phí chỉ với email, luyện đề không giới hạn.</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="rounded-md bg-brand-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-800">
            Tạo tài khoản miễn phí
          </Link>
          <Link to="/login" className="rounded-md border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-brand-900 hover:text-brand-900">
            Đăng nhập
          </Link>
        </div>

        <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-500">
          {["Chấm điểm thang 10", "Lưu lịch sử từng lần làm"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 bg-brand-400" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
