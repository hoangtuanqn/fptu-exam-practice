// Thanh thời gian còn lại của chế độ Thi có giới hạn: giảm dần từ phải sang trái, đổi màu khi gần hết giờ.
// Dùng ở thanh đầu trang và trong cửa sổ phóng to ảnh (cửa sổ này phủ kín thanh đầu trang nên phải có bản riêng).
const percentOf = (left: number, limit: number) => Math.max(0, Math.min(100, (left / limit) * 100));

/** Màu theo phần thời gian còn lại: xanh thương hiệu, còn dưới 25% thì vàng, dưới 10% (hoặc dưới 1 phút) thì đỏ. */
export function timerTone(left: number, limit: number) {
  const pct = percentOf(left, limit);
  if (pct <= 10 || left <= 60) return { bar: "bg-rose-500", text: "font-semibold text-rose-600", onDark: "font-semibold text-rose-300" };
  if (pct <= 25) return { bar: "bg-amber-500", text: "font-semibold text-amber-700", onDark: "font-semibold text-amber-300" };
  return { bar: "bg-brand-500", text: "", onDark: "text-slate-200" };
}

interface Props {
  left: number; // giây còn lại
  limit: number; // tổng giây của bài thi
  className?: string;
}

export function ExamTimerBar({ left, limit, className = "" }: Props) {
  return (
    <div
      role="progressbar"
      aria-label="Thời gian còn lại"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.max(0, left)}
      className={`h-1.5 w-full overflow-hidden bg-outline-variant/40 ${className}`}
    >
      <div className={`h-full ${timerTone(left, limit).bar} transition-[width,background-color] duration-1000 ease-linear`} style={{ width: `${percentOf(left, limit)}%` }} />
    </div>
  );
}
