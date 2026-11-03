import { useEffect, useState } from "react";
import { Loader2, Sparkles, TriangleAlert, X } from "lucide-react";
import type { AnswerSource, Mode } from "@/features/practice/types";
import { formatDuration } from "@/features/practice/utils/format";

// Dải thông báo trên màn hình làm bài, theo nguồn đáp án:
// - PENDING: AI đang phân tích, chỉ xem đề, chưa chọn đáp án (kèm thanh tiến trình)
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
    // Không biết AI mất bao lâu nên thanh chạy theo thời gian, chậm dần và không bao giờ chạm 100% khi chưa xong
    const percent = Math.round(95 * (1 - Math.exp(-seconds / 80)));
    return (
      <div role="status" aria-live="polite" className="mb-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-900">
        <div className="flex items-start gap-2.5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <span className="font-medium">AI đang phân tích đáp án…</span>{" "}
            <span className="text-brand-800/80">Bạn xem đề trước, phần chọn đáp án sẽ mở khi AI xong.</span>
          </div>
          <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-brand-600" />
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden>
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-xs tabular-nums text-brand-800/70">
          <span>Đã chờ {formatDuration(seconds)}{seconds >= 180 && " · lâu hơn dự kiến một chút"}</span>
          <span>{percent}%</span>
        </div>
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
