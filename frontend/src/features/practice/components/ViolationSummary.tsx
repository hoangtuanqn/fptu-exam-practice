import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { Violation } from "@/features/practice/types";

const SHOWN = 10;

// Tóm tắt các lần rời bài thi (chế độ Thi): ở bảng điểm và trang chi tiết bài làm
export function ViolationSummary({ violations, className = "" }: { violations: Violation[]; className?: string }) {
  if (violations.length === 0) {
    return (
      <p className={`md-body-medium flex items-center gap-2 rounded-m3-md bg-surface-container-highest px-4 py-3 text-on-surface ${className}`}>
        <ShieldCheck size={18} className="shrink-0 text-primary" aria-hidden /> Bạn giữ tập trung suốt bài thi
      </p>
    );
  }
  const total = violations.reduce((s, v) => s + v.sec, 0);
  const rest = violations.length - SHOWN;
  return (
    <section aria-label="Vi phạm khi thi" className={`rounded-m3-md bg-surface-container-highest px-4 py-3 ${className}`}>
      <div className="md-title-small flex items-center gap-2 text-on-surface">
        <ShieldAlert size={18} className="shrink-0 text-error" aria-hidden />
        Vi phạm: {violations.length} lần · rời bài tổng {total} giây
      </div>
      <ul className="md-body-medium mt-2 space-y-0.5 text-on-surface-variant">
        {violations.slice(0, SHOWN).map((v, i) => (
          <li key={i}>
            Phút {Math.floor(v.at / 60) + 1}: rời {v.sec} giây
          </li>
        ))}
        {rest > 0 && <li>và {rest} lần khác</li>}
      </ul>
      <p className="md-body-small mt-2 text-on-surface-variant">Lần sau thử giữ toàn màn hình đến hết bài để quen với phòng thi thật.</p>
    </section>
  );
}
