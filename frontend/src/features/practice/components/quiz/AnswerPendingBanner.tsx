import { Loader2, Sparkles } from "lucide-react";

// Hiện khi AI đang phân tích đáp án: người dùng làm bài ngay, đáp án và kết quả từng câu hiện sau
export function AnswerPendingBanner({ mode }: { mode: "practice" | "exam" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-2 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-900"
    >
      <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <span className="font-medium">AI đang phân tích đáp án…</span>{" "}
        <span className="text-brand-800/80">
          {mode === "practice"
            ? "Bạn cứ làm bài, kết quả từng câu sẽ hiện khi AI xong."
            : "Bạn cứ làm bài, điểm sẽ có ngay khi AI xong đáp án."}
        </span>
      </div>
      <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-brand-600" />
    </div>
  );
}
