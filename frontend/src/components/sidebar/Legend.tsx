import type { Mode } from "../../types";

interface Item {
  label: string;
  dot: string;
}

const BASE: Item[] = [
  { label: "Chưa làm", dot: "border border-slate-300 bg-white" },
  { label: "Đã làm", dot: "bg-brand-900" },
];
const FLAG: Item = { label: "Đánh dấu", dot: "rounded-full bg-amber-500" };
const RESULT: Item[] = [
  { label: "Đúng", dot: "bg-emerald-600" },
  { label: "Sai", dot: "bg-rose-600" },
];

// Chú thích màu: luyện tập thấy kết quả ngay nên hiện đủ; thi chỉ hiện kết quả sau khi nộp
export function Legend({ mode, submitted }: { mode: Mode; submitted: boolean }) {
  const items = [...(mode === "practice" ? [...BASE, ...RESULT] : submitted ? RESULT : BASE), FLAG];

  return (
    <div className="hidden flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 lg:flex">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
