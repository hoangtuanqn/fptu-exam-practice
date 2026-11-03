import { Check, Minus, X } from "lucide-react";
import type { AttemptQuestion, Outcome } from "@/features/history/types";
import { Empty } from "@/shared/ui/Feedback";

const STYLE: Record<Outcome, { box: string; icon: typeof Check; label: string }> = {
  correct: { box: "border-emerald-200 bg-emerald-50/60", icon: Check, label: "Đúng" },
  wrong: { box: "border-rose-200 bg-rose-50/60", icon: X, label: "Sai" },
  skipped: { box: "border-slate-200 bg-slate-50", icon: Minus, label: "Chưa làm" },
  ungraded: { box: "border-slate-200 bg-white", icon: Minus, label: "Chưa có đáp án" },
};

const TEXT: Record<Outcome, string> = {
  correct: "text-emerald-700",
  wrong: "text-rose-700",
  skipped: "text-slate-500",
  ungraded: "text-slate-400",
};

const show = (list: string[]) => (list.length ? list.join(", ") : "—");

// Lưới các câu: số câu, đáp án đã chọn, đáp án đúng, kết quả
export function QuestionResultGrid({ items }: { items: AttemptQuestion[] }) {
  if (items.length === 0) return <Empty title="Không có câu nào trong mục này" />;

  return (
    <ul className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((q) => {
        const { box, icon: Icon, label } = STYLE[q.outcome];
        return (
          <li key={q.number} className={`rounded-lg border px-4 py-3 ${box}`}>
            <div className="flex items-center justify-between">
              <span className="font-serif text-base font-semibold text-slate-900">Câu {q.number}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${TEXT[q.outcome]}`}>
                <Icon size={14} /> {label}
              </span>
            </div>
            <dl className="mt-2 space-y-0.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Bạn chọn</dt>
                <dd className="font-medium text-slate-800">{show(q.chosen)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Đáp án đúng</dt>
                <dd className="font-medium text-slate-800">{show(q.correct)}</dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
