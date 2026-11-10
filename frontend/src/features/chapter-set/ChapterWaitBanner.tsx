import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { formatDuration } from "@/features/practice/utils/format";

export type ChapterWaitStage = "solving" | "labeling";

const STEPS: Record<ChapterWaitStage, { step: number; title: string; hint: string }> = {
  solving: { step: 1, title: "AI đang phân tích đáp án của đề", hint: "Đề mới lấy về cần có đáp án trước, rồi mới xếp từng câu vào chương." },
  labeling: { step: 2, title: "AI đang xếp từng câu vào chương", hint: "Đối chiếu từng câu với các chương trong syllabus của môn." },
};

// Dải chờ ở bước chọn chương (cùng kiểu với dải "Đang chuẩn bị đáp án" lúc làm bài): cho người dùng biết AI đang làm gì và đã chờ bao lâu.
// Không biết trước AI mất bao lâu nên thanh chạy theo thời gian, chậm dần, không chạm 100% khi chưa xong. Bước 2 chiếm nửa sau của thanh.
export function ChapterWaitBanner({ stage }: { stage: ChapterWaitStage }) {
  const [seconds, setSeconds] = useState(0);
  const labelingFrom = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (stage === "labeling" && labelingFrom.current === null) labelingFrom.current = seconds;

  const percent =
    stage === "solving" ? Math.round(50 * (1 - Math.exp(-seconds / 90))) : Math.round(50 + 45 * (1 - Math.exp(-(seconds - (labelingFrom.current ?? seconds)) / 25)));
  const s = STEPS[stage];

  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-900">
      <div className="flex items-start gap-2.5">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-700" />
        <div className="min-w-0 flex-1">
          <span className="font-medium">
            Bước {s.step}/2 · {s.title}…
          </span>{" "}
          <span className="text-brand-800/80">{s.hint} Bạn cứ ở lại trang này, danh sách chương sẽ tự hiện.</span>
        </div>
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-brand-700" />
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden>
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs tabular-nums text-brand-800/70">
        <span>
          Đã chờ {formatDuration(seconds)}
          {seconds >= 240 && " · lâu hơn dự kiến một chút"}
        </span>
        <span>{percent}%</span>
      </div>
    </div>
  );
}
