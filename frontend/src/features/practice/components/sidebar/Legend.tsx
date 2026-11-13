import type { Mode } from "@/features/practice/types.ts";

interface Item {
  label: string;
  dot: string;
}

const BASE: Item[] = [
  { label: "Chưa làm", dot: "border border-outline" },
  { label: "Đã làm", dot: "bg-secondary-container" },
];
const FLAG: Item = { label: "Đánh dấu", dot: "rounded-full bg-warning" };
const RESULT: Item[] = [
  { label: "Đúng", dot: "bg-success-container" },
  { label: "Sai", dot: "bg-error-container" },
];

// Chú thích màu: luyện tập thấy kết quả ngay nên hiện đủ; thi chỉ hiện kết quả sau khi nộp
export function Legend({ mode, submitted }: { mode: Mode; submitted: boolean }) {
  const items = [...(mode === "practice" ? [...BASE, ...RESULT] : submitted ? RESULT : BASE), FLAG];

  return (
    <div className="md-label-medium flex flex-wrap gap-x-4 gap-y-1.5 border-t border-outline-variant pt-3 font-normal text-on-surface-variant">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-3 w-3 rounded-sm ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
