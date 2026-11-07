import { useEffect, useState } from "react";
import { useToast } from "@/shared/context/ToastContext";
import { Loader2, RotateCw, Sparkles, TriangleAlert } from "lucide-react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import type { AnswerSource } from "@/features/practice/types";
import { formatDuration } from "@/features/practice/utils/format";

// Dải thông báo trên màn hình làm bài, theo nguồn đáp án:
// - PENDING: AI đang phân tích, chỉ xem đề, chưa chọn đáp án (kèm thanh tiến trình)
// - FAILED: AI giải lỗi, đề chỉ xem được, có nút thử lại
// - AI / MANUAL: không hiện gì
export function AnswerPendingBanner({ source, examId, onRetry }: { source: AnswerSource | null; examId: number | null; onRetry: () => void }) {
  const toast = useToast();
  const [seconds, setSeconds] = useState(0);
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    if (examId === null) return;
    setRetrying(true);
    try {
      await examImportApi.retrySolve(examId);
      setSeconds(0);
      onRetry();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chưa thử lại được, vui lòng đợi ít phút");
    } finally {
      setRetrying(false);
    }
  }

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
          <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1">
            <span className="font-medium">Đang chuẩn bị đáp án…</span>{" "}
            <span className="text-brand-800/80">Bạn xem đề trước, phần chọn đáp án sẽ mở khi đáp án sẵn sàng.</span>
          </div>
          <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-brand-700" />
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

  if (source === "FAILED" || source === "DEFAULT") {
    return (
      <div role="alert" className="mb-2 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-900">
        <TriangleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">Chưa lấy được đáp án của đề này.</div>
          <div className="mt-0.5 text-rose-800/80">Đề chỉ xem được, chưa làm bài được vì chưa có đáp án chính xác. Lỗi đã được ghi lại để quản trị viên xử lý.</div>
          <button
            onClick={retry}
            disabled={retrying || examId === null}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-surface-container-lowest px-3 py-1.5 text-xs font-medium text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
          >
            {retrying ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
            Thử lại
          </button>
        </div>
      </div>
    );
  }
  return null;
}
