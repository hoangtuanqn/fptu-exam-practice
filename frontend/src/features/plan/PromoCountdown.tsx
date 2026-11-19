import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

// Đếm ngược từng giây tới hạn chót THẬT của đợt ưu đãi (tới 0 thì đợt hết, giá về như cũ): "2 ngày 03:12:45"
export function PromoCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((Date.parse(endsAt) - now) / 1000));
  const d = Math.floor(s / 86400);
  const clock = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return (
    <span className={`tabular-nums ${className ?? ""}`} role="timer" aria-label={`Ưu đãi còn ${d} ngày ${clock}`}>
      {s === 0 ? "đã kết thúc" : `${d > 0 ? `${d} ngày ` : ""}${clock}`}
    </span>
  );
}
