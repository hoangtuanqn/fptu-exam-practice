import { Link } from "react-router-dom";
import { ArrowRight, Check, Gift } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { offersApi } from "@/features/landing/offers.api";
import { useApi } from "@/shared/hooks/useApi";

const EXAMS = 4; // số đề trong ưu đãi
const DEFAULT_PRICE = 500; // phí mỗi đề hiện khi chưa lấy được phí thật từ máy chủ

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

// Tờ bài thi đã chấm: đề bài, bốn phương án, đáp án đúng khoanh bút đỏ và điểm ở góc, như bài thi giấy thật
function ExamPaper() {
  return (
    <div
      aria-hidden
      className="relative w-full max-w-[19rem] rounded-sm border border-slate-200 bg-white p-5 shadow-[0_1px_0_#e2e8f0,0_16px_30px_-20px_rgba(11,23,48,0.5)]"
    >
      <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 font-display">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Đề thi thử</span>
        <span className="text-[10px] text-slate-400">Mã đề 01</span>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="h-1.5 w-full rounded-sm bg-slate-200" />
        <div className="h-1.5 w-10/12 rounded-sm bg-slate-200" />
      </div>

      <ol className="mt-4 space-y-2.5">
        {["A", "B", "C", "D"].map((o, i) => {
          const right = i === 1;
          return (
            <li key={o} className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-display text-[10px] font-semibold ${
                  right ? "border-emerald-600 text-emerald-600 ring-2 ring-emerald-500/25" : "border-slate-200 text-slate-400"
                }`}
              >
                {o}
              </span>
              <span className={`h-1.5 rounded-sm ${right ? "w-9/12 bg-emerald-200" : "w-7/12 bg-slate-200"}`} />
              {right && <Check size={14} strokeWidth={3} className="text-emerald-600" />}
            </li>
          );
        })}
      </ol>

      {/* Điểm chấm bằng bút đỏ */}
      <span className="absolute -bottom-3 -right-3 -rotate-6 rounded-full border-2 border-emerald-600 bg-white px-3 py-0.5 font-display text-3xl font-bold italic leading-tight text-emerald-600">
        10
      </span>
    </div>
  );
}

/**
 * Thẻ ưu đãi ngay đầu trang chủ, trình bày như một tờ thông tin: viền mảnh, vạch navy trên đầu, chữ có chân, bảng thông số
 * có đường chấm. Không chữ chuyển sắc, không phát sáng, không chuyển động; một điểm nhấn vàng đồng.
 * Thiết kế theo vài nguyên tắc có nghiên cứu:
 *  - Người dùng quét chứ không đọc: mỗi cụm chỉ một ý, mỗi từ khoá xuất hiện một lần.
 *  - Một điểm nhấn duy nhất (con số lớn) và một nút bấm duy nhất.
 *  - Endowed progress (Nunes & Drèze 2006): quà đăng ký là tiến độ đã có sẵn (2/4 đề đã mở), không chỉ là một con số credit.
 * Giá và số đề được tặng lấy từ cấu hình admin nên luôn khớp số tiền thật; admin không tặng thì phần quà tự ẩn.
 */
export function PromoCard() {
  const price = useApi(() => examImportApi.price(), []).data?.price ?? DEFAULT_PRICE;
  const bonus = useApi(() => authApi.signupBonus(), []).data?.credit ?? 0;
  const offers = useApi(() => offersApi.get(), []).data; // ưu đãi giải thích AI và thưởng nạp, đọc từ cấu hình admin

  const total = price * EXAMS;
  const gifted = price <= 0 ? EXAMS : Math.min(EXAMS, Math.floor(bonus / price)); // số đề đã mở sẵn bằng quà đăng ký
  const hasGift = gifted > 0;

  const rows: [string, string][] = [
    ["Số đề thi", `${EXAMS} đề`],
    ["Trọn bộ", total > 0 ? vnd(total) : "Miễn phí"],
    ["Hoàn tiền", "nếu lấy đề lỗi"],
  ];
  if (offers) {
    const explain = [offers.freeTrials > 0 && `${offers.freeTrials} câu miễn phí`, offers.bundleDiscountPercent > 0 && `cả đề -${offers.bundleDiscountPercent}%`].filter(Boolean).join(" · ");
    if (offers.explainPrice > 0 && explain) rows.push(["Giải thích AI", explain]);
    const topBonus = Math.max(0, ...offers.depositBonusTiers.map((t) => t.percent));
    if (topBonus > 0) rows.push(["Nạp credit", `thưởng đến ${topBonus}%`]);
  }

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-lg border border-slate-200 border-t-4 border-t-brand-900 bg-white text-left shadow-[0_18px_40px_-28px_rgba(11,23,48,0.5)]">
      <div className="grid sm:grid-cols-[1.1fr_1fr]">
        <div className="p-5 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">Ưu đãi dành cho sinh viên</p>

          <div className="mt-2 font-display text-8xl font-semibold leading-[0.9] tracking-tight text-brand-900 sm:text-[7rem]">200+</div>
          <div className="mt-1 font-display text-xl italic text-slate-600">câu hỏi có đáp án</div>

          <dl className="mt-5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-dotted border-slate-200 py-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs italic text-slate-500">Không cần nâng cấp VIP bên FuOverflow.</p>

          <Link
            to="/register"
            className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-800 sm:w-auto"
          >
            {hasGift ? "Nhận quà ngay" : "Bắt đầu ngay"}
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-2.5 text-xs text-slate-500">Đăng ký miễn phí, chỉ cần email.</p>
        </div>

        <div className="flex items-center justify-center border-t border-slate-200 bg-paper p-8 sm:border-l sm:border-t-0">
          <ExamPaper />
        </div>
      </div>

      {/* Quà đăng ký: một hàng gọn, bốn ô đề (ô đã mở được đánh dấu) */}
      {hasGift && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-paper px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <Gift size={22} strokeWidth={1.6} className="shrink-0 text-brand-700" />
            <div className="leading-tight">
              <div className="text-xs font-semibold text-slate-600">Đăng ký lần đầu nhận ngay</div>
              <div className="font-display text-xl font-bold text-brand-900">{bonus.toLocaleString("vi-VN")} credit</div>
            </div>
          </div>


          <div className="text-xs font-semibold text-slate-500 sm:text-right">
            {gifted < EXAMS ? (
              <>
                Mở sẵn <b className="text-brand-900">{gifted}/{EXAMS}</b> đề
              </>
            ) : (
              <b className="text-brand-900">Bộ đề thi FE FPTU</b>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
