import { useEffect, useState } from "react";
import { Loader2, Sparkles, TriangleAlert, X } from "lucide-react";
import type { AnswerSource, Mode } from "@/features/practice/types";
import { formatDuration } from "@/features/practice/utils/format";

// Dải thông báo trên màn hình làm bài, theo nguồn đáp án:
// - PENDING: AI đang phân tích, làm bài được ngay (kèm đồng hồ chờ)
// - DEFAULT: đáp án chỉ là tạm (A), điểm chỉ để tham khảo (có thể tắt)
// - AI / MANUAL: không hiện gì
export function AnswerPendingBanner({ source, mode }: { source: AnswerSource | null; mode: Mode }) {
  const [seconds, setSeconds] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (source !== "PENDING") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [source]);

  if (source === "PENDING") {
    return (
      <div role="status" aria-live="polite" className="mb-2 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-900">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <span className="font-medium">AI đang phân tích đáp án…</span>{" "}
          <span className="text-brand-800/80">
            {mode === "practice" ? "Bạn cứ làm bài, kết quả từng câu sẽ hiện khi AI xong." : "Bạn cứ làm bài, điểm sẽ có ngay khi AI xong đáp án."}
          </span>
          <div className="mt-0.5 text-xs tabular-nums text-brand-800/70">
            Đã chờ {formatDuration(seconds)}
            {seconds >= 180 && " · lâu hơn dự kiến một chút, bạn cứ làm tiếp, không mất gì"}
          </div>
        </div>
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-brand-600" />
      </div>
    );
  }

  if (source === "DEFAULT" && !dismissed) {
    return (
      <div role="status" className="mb-2 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
        <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <span className="font-medium">Đề này chưa có đáp án chính xác.</span>{" "}
          <span className="text-amber-800/80">Đang dùng đáp án tạm (A) cho mọi câu nên điểm chỉ mang tính tham khảo.</span>
        </div>
        <button onClick={() => setDismissed(true)} aria-label="Ẩn thông báo" className="shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-100">
          <X size={15} />
        </button>
      </div>
    );
  }
  return null;
}
