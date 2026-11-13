import { Clock } from "lucide-react";
import { formatDuration } from "@/features/practice/utils/format";

// Đồng hồ đếm ngược của chế độ Thi có giới hạn: biểu tượng + số còn lại + thanh nhỏ giảm dần, gói trong một khối.
// Dùng ở thanh đầu trang và trong cửa sổ phóng to ảnh (cửa sổ này phủ kín thanh đầu trang nên phải có bản riêng).
const percentOf = (left: number, limit: number) => Math.max(0, Math.min(100, (left / limit) * 100));

/** Màu theo phần thời gian còn lại: bình thường, còn dưới 25% thì vàng, dưới 10% (hoặc dưới 1 phút) thì đỏ. */
function toneOf(left: number, limit: number) {
  const pct = percentOf(left, limit);
  if (pct <= 10 || left <= 60) return { bar: "bg-rose-500", text: "text-rose-600", onDark: "text-rose-300" };
  if (pct <= 25) return { bar: "bg-amber-500", text: "text-amber-700", onDark: "text-amber-300" };
  return { bar: "bg-brand-500", text: "text-on-surface", onDark: "text-white" };
}

interface Props {
  left: number; // giây còn lại
  limit: number; // tổng giây của bài thi
  onDark?: boolean; // đặt trên nền tối (cửa sổ phóng to)
}

export function ExamTimer({ left, limit, onDark = false }: Props) {
  const tone = toneOf(left, limit);
  const urgent = tone.bar !== "bg-brand-500";
  return (
    <div
      role="timer"
      aria-label={`Thời gian còn lại ${formatDuration(left)}`}
      title="Thời gian còn lại"
      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${
        onDark ? "border-white/20 bg-white/10" : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <Clock size={15} className={`shrink-0 ${urgent ? (onDark ? tone.onDark : tone.text) : onDark ? "text-slate-300" : "text-brand-700"}`} aria-hidden />
      <span className={`min-w-[3.4rem] text-center text-base font-bold leading-none tabular-nums ${onDark ? tone.onDark : tone.text}`}>{formatDuration(left)}</span>
      <div
        role="progressbar"
        aria-label="Thời gian còn lại"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.max(0, left)}
        className={`h-2 w-10 overflow-hidden rounded-full sm:w-24 ${onDark ? "bg-white/20" : "bg-outline-variant/40"}`}
      >
        <div className={`h-full rounded-full ${tone.bar} transition-[width,background-color] duration-1000 ease-linear`} style={{ width: `${percentOf(left, limit)}%` }} />
      </div>
    </div>
  );
}
