import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { GOLD_BUTTON } from "@/shared/ui/gold";
import { GIFT_EXAMS as EXAMS, useSignupGift } from "../useSignupGift";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

// Tờ bài thi đã chấm: đề bài, bốn phương án, đáp án đúng khoanh bút đỏ và điểm ở góc, như bài thi giấy thật
function ExamPaper() {
  return (
    <div
      aria-hidden
      className="relative w-full max-w-[19rem] rotate-2 rounded-md border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_1px_0_var(--md-sys-color-outline-variant),0_24px_44px_-20px_rgba(70,45,0,0.6)]"
    >
      <div className="flex items-baseline justify-between border-b border-outline-variant pb-2 font-display">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Đề thi thử
        </span>
        <span className="text-[10px] text-outline">Mã đề 01</span>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="h-1.5 w-full rounded-sm bg-surface-container-highest" />
        <div className="h-1.5 w-10/12 rounded-sm bg-surface-container-highest" />
      </div>

      <ol className="mt-4 space-y-2.5">
        {["A", "B", "C", "D"].map((o, i) => {
          const right = i === 1;
          return (
            <li key={o} className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-display text-[10px] font-semibold ${
                  right
                    ? "border-emerald-600 text-emerald-600 ring-2 ring-emerald-500/25"
                    : "border-outline-variant text-outline"
                }`}
              >
                {o}
              </span>
              <span
                className={`h-1.5 rounded-sm ${right ? "w-9/12 bg-emerald-200" : "w-7/12 bg-surface-container-highest"}`}
              />
              {right && (
                <Check size={14} strokeWidth={3} className="text-emerald-600" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Điểm chấm bằng bút đỏ */}
      <span className="absolute -bottom-3 -right-3 -rotate-6 rounded-full border-2 border-emerald-600 bg-surface-container-lowest px-3 py-0.5 shadow-m3-2 font-display text-3xl font-bold italic leading-tight text-emerald-600">
        10
      </span>
    </div>
  );
}

/**
 * Thẻ ưu đãi ngay đầu trang chủ, trình bày như một tờ thông tin: vạch vàng trên đầu, chữ có chân, bảng thông số có đường chấm,
 * tờ bài thi nghiêng nhẹ trên nền quầng vàng. Nút vàng bóng có ánh lóe (tự tắt khi người dùng bật giảm chuyển động).
 * Thiết kế theo vài nguyên tắc có nghiên cứu:
 *  - Người dùng quét chứ không đọc: mỗi cụm chỉ một ý, mỗi từ khoá xuất hiện một lần.
 *  - Một điểm nhấn duy nhất (con số lớn) và một nút bấm duy nhất.
 *  - Endowed progress (Nunes & Drèze 2006): quà đăng ký là tiến độ đã có sẵn (2/4 đề đã mở), không chỉ là một con số credit.
 * Giá và số đề được tặng lấy từ cấu hình admin nên luôn khớp số tiền thật; admin không tặng thì phần quà tự ẩn.
 */
export function PromoCard() {
  const { price, hasGift } = useSignupGift();

  const total = price * EXAMS;

  const rows: [string, string][] = [
    ["Số đề thi", `${EXAMS} đề`],
    ["Trọn bộ", total > 0 ? vnd(total) : "Miễn phí"],
  ];

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-m3-xl border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low text-left shadow-[0_1px_2px_rgba(0,0,0,0.05),0_28px_60px_-28px_rgba(70,45,0,0.4)]">
      <div aria-hidden className="h-1.5 bg-gradient-to-r from-[#ffd75e] via-[#ffc61f] to-[#e89a00]" />
      <div className="grid sm:grid-cols-[1.1fr_1fr]">
        <div className="p-5 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            Ưu đãi dành cho sinh viên
          </p>

          <div className="mt-2 font-display text-8xl font-semibold leading-[0.9] tracking-tight sm:text-[7rem]"><span className="bg-gradient-to-b from-[#e89a00] to-[#8a6200] bg-clip-text text-transparent">
            200+
          </span></div>
          <div className="mt-1 font-display text-xl italic text-on-surface-variant">
            câu hỏi có đáp án
          </div>

          <dl className="mt-5 text-sm">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-4 border-b border-dotted border-outline-variant py-1.5"
              >
                <dt className="text-on-surface-variant">{k}</dt>
                <dd className="font-semibold text-on-surface">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs italic text-on-surface-variant">
            Không cần nâng cấp VIP bên FuOverflow.
          </p>

          <Link
            to="/register"
            className={`pro-cta group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-extrabold transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto ${GOLD_BUTTON}`}
          >
            {hasGift ? "Nhận quà ngay" : "Bắt đầu ngay"}
            <ArrowRight
              size={18}
              className="transition group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div className="relative flex items-center justify-center overflow-hidden border-t border-outline-variant bg-gradient-to-br from-surface to-surface-container-low p-8 sm:border-l sm:border-t-0">
          <div aria-hidden className="absolute h-48 w-48 rounded-full bg-[#ffc61f]/25 blur-3xl" />
          <ExamPaper />
        </div>
      </div>

    </div>
  );
}
