import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { logos } from "@/shared/brand/brand";
import { useApi } from "@/shared/hooks/useApi";

const EXAMS = 4; // số đề trong ưu đãi
const QUESTIONS = 200; // tổng số câu của các đề đó
const DEFAULT_TOTAL = 2000; // giá hiện khi chưa lấy được phí thật từ máy chủ

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const gradientText = "bg-gradient-to-r from-amber-300 via-amber-200 to-accent-soft bg-clip-text text-transparent";

// Một tờ đề thi thu nhỏ: tên đề, dòng đề bài giả, bốn đáp án (đáp án đúng tô xanh)
function ExamSheet({ n, correct }: { n: number; correct: number }) {
  return (
    <div className="h-full w-full rounded-2xl bg-white p-3 text-slate-800 shadow-[0_12px_30px_-8px_rgba(2,6,23,0.55)] ring-1 ring-slate-900/5">
      <div className="flex items-center gap-2">
        <img src={logos.partner} alt="" className="h-6 w-6 rounded-md" />
        <div className="text-[11px] font-bold leading-none text-slate-900">Đề thi FE · 0{n}</div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-slate-200" />
        <div className="h-1.5 w-10/12 rounded-full bg-slate-200" />
      </div>
      <div className="mt-3 space-y-1.5">
        {["A", "B", "C", "D"].map((o, i) => (
          <div
            key={o}
            className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${i === correct ? "bg-emerald-50 ring-1 ring-emerald-300" : "bg-slate-50"}`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${i === correct ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
            >
              {i === correct ? <Check size={9} strokeWidth={4} /> : o}
            </span>
            <span className={`h-1.5 rounded-full ${i === correct ? "w-9/12 bg-emerald-300" : "w-7/12 bg-slate-200"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Hình minh hoạ: bốn tờ đề thi xoè như xấp bài, kèm huy hiệu "200 câu" và "Điểm 10"
function PromoVisual() {
  return (
    <div className="relative mx-auto mb-3 h-60 w-full max-w-[22rem] sm:mb-0 sm:h-72" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40 blur-3xl" />
      {[0, 1, 2, 3].map((i) => {
        const k = i - 1.5; // -1.5 … 1.5: xoè đều quanh tâm
        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-40 w-32 sm:h-52 sm:w-40"
            style={{
              transform: `translate(-50%, -50%) translate(${k * 38}px, ${Math.abs(k) * 10 - 6}px) rotate(${k * 9}deg)`,
              zIndex: i,
            }}
          >
            <ExamSheet n={i + 1} correct={(i * 3 + 1) % 4} />
          </div>
        );
      })}

      <div className="absolute -top-1 right-1 z-10 flex h-16 w-16 rotate-12 flex-col items-center justify-center rounded-full bg-amber-400 text-brand-900 shadow-card ring-4 ring-white/30 sm:right-2 sm:h-20 sm:w-20">
        <span className="text-xl font-extrabold leading-none sm:text-2xl">{QUESTIONS}</span>
        <span className="text-[9px] font-bold uppercase leading-tight sm:text-[10px]">câu hỏi</span>
      </div>
      <div className="absolute -bottom-1 left-0 z-10 inline-flex -rotate-6 items-center gap-1.5 rounded-2xl bg-emerald-400 px-3 py-1.5 text-sm font-extrabold text-emerald-950 shadow-card ring-4 ring-white/30 sm:left-2 sm:text-base">
        <Sparkles size={16} /> Điểm 10
      </div>
    </div>
  );
}

// Thẻ ưu đãi ngay đầu trang chủ: ít chữ, giá thật to, hình minh hoạ chiếm nửa thẻ.
// Giá = số đề × phí lấy đề admin đang cấu hình (khớp số tiền bị trừ thật); chưa tải được thì hiện giá mặc định.
export function PromoCard() {
  const { data } = useApi(() => examImportApi.price(), []);
  const total = data ? data.price * EXAMS : DEFAULT_TOTAL;

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-5 text-left text-white shadow-[0_24px_60px_-16px_rgba(0,102,255,0.55)] ring-1 ring-white/10 sm:p-8">
      <div aria-hidden className="bg-dots absolute inset-0 opacity-15 [mask-image:radial-gradient(ellipse_80%_70%_at_20%_0%,#000_10%,transparent_100%)]" />

      <div className="relative grid items-center gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="text-center sm:text-left">
          <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-900">
            Ưu đãi sinh viên
          </span>

          <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{EXAMS} đề thi FE</h2>

          {total > 0 ? (
            <div className={`${gradientText} text-6xl font-extrabold leading-none sm:text-7xl`}>{vnd(total)}</div>
          ) : (
            <div className="text-5xl font-extrabold leading-none text-amber-300 sm:text-6xl">Miễn phí</div>
          )}
          <p className="mt-2 text-base font-medium text-brand-100">Khỏi mua gói VIP FUO</p>

          <div className="relative mt-5 inline-block w-full sm:w-auto">
            <span aria-hidden className="absolute inset-0 rounded-2xl bg-white/40 motion-safe:animate-pulse" />
            <Link
              to="/register"
              className="group relative flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-bold text-brand-800 shadow-card transition hover:bg-brand-50 active:scale-[0.98]"
            >
              Nhận ngay
              <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <PromoVisual />
      </div>
    </div>
  );
}
