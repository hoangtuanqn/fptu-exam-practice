import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { useFakeProgress } from "@/shared/hooks/useFakeProgress";
import { useResizableWidth } from "@/shared/hooks/useResizableWidth";
import { Button } from "@/shared/ui/Button";
import { Markdown } from "@/shared/ui/Markdown";
import { explanationApi } from "./explanation.api";

interface Props {
  examId: number;
  questionNumber: number;
  firstTime: boolean; // vừa trả phí lần đầu: hiện hiệu ứng "AI đang phân tích". Đã mua rồi thì chỉ hiển thị.
  onClose: () => void;
  onBought: () => void; // báo đã mua (để nút đổi sang "xem giải thích")
}

type Phase = "loading" | "done" | "error";

// Khung giải thích ở màn hình rộng kéo co dãn được; vùng đề bên cạnh tự co theo, nên luôn chừa lại chừng này cho nó
const PANEL_MIN = 288;
const PANEL_RESERVE = 640; // chỗ cho thanh số câu + vùng đề
const PANEL_MAX = 900;
const panelDefault = () => (window.innerWidth >= 1280 ? 480 : 416);
const panelMax = () => Math.min(PANEL_MAX, window.innerWidth - PANEL_RESERVE);

// Bản lời giải đã lưu sẵn vẫn "phân tích" thêm vài giây cho người trả phí lần đầu, để đồng nhất trải nghiệm
const MIN_CACHED_WAIT_MS = 2000;
const CACHED_WAIT_JITTER_MS = 2000;

/**
 * Lời giải thích AI của một câu, đặt cạnh đề để người học vừa xem đề vừa đọc lời giải:
 * màn hình rộng là cột bên phải, màn hình hẹp là tấm trượt từ dưới lên (đề vẫn thấy phía trên).
 */
export function ExplainPanel({ examId, questionNumber, firstTime, onClose, onBought }: Props) {
  const { refresh } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const started = useRef(false);
  const percent = useFakeProgress(firstTime && phase === "loading", phase === "done");
  const resize = useResizableWidth({ storageKey: "explain_panel_width", initial: panelDefault, min: PANEL_MIN, max: panelMax });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function load() {
    setPhase("loading");
    setError(null);
    const startedAt = Date.now();
    try {
      const result = await explanationApi.explain(examId, questionNumber);
      onBought();
      if (result.charged > 0) void refresh(); // cập nhật số dư sau khi trừ phí
      if (firstTime && result.cached) {
        const target = MIN_CACHED_WAIT_MS + Math.random() * CACHED_WAIT_JITTER_MS;
        await new Promise((r) => setTimeout(r, Math.max(0, target - (Date.now() - startedAt))));
      }
      if (!alive.current) return;
      setContent(result.content);
      setPhase("done");
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof ApiError ? err.message : "Không tải được lời giải thích");
      setPhase("error");
    }
  }

  // Tải ngay khi mở (cờ chặn vì StrictMode chạy effect hai lần)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside
      aria-label={`Lời giải thích câu ${questionNumber}`}
      style={{ "--panel-w": `${resize.width}px` } as CSSProperties}
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[58dvh] flex-col rounded-t-2xl border-t border-slate-200 bg-surface-container-lowest shadow-[0_-8px_30px_rgba(15,23,42,0.12)] lg:relative lg:z-auto lg:max-h-none lg:w-[var(--panel-w)] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
    >
      {/* Tay kéo ở mép trái (chỉ màn hình rộng): kéo sang trái để rộng ra, sang phải để hẹp lại; nhấp đúp về mặc định */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để đổi độ rộng lời giải thích (hoặc dùng phím mũi tên trái, phải)"
        aria-valuemin={resize.min}
        aria-valuemax={resize.max}
        aria-valuenow={resize.width}
        title="Kéo để đổi độ rộng · nhấp đúp để về mặc định"
        tabIndex={0}
        {...resize.handleProps}
        className="group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none outline-none lg:block"
      >
        <span className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors ${resize.dragging ? "bg-brand-500" : "bg-transparent group-hover:bg-brand-300 group-focus-visible:bg-brand-400"}`} />
        <span className={`absolute left-1/2 top-1/2 h-12 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${resize.dragging ? "bg-brand-500" : "bg-slate-300 group-hover:bg-brand-400 group-focus-visible:bg-brand-500"}`} />
      </div>

      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Sparkles size={15} />
          </span>
          Giải thích câu {questionNumber}
        </h2>
        <button onClick={onClose} aria-label="Đóng lời giải thích" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {phase === "loading" &&
          (firstTime ? (
            <div className="space-y-3 py-6 text-center" role="status" aria-live="polite">
              <Loader2 size={28} className="mx-auto animate-spin text-brand-700" />
              <div className="text-sm font-medium text-slate-900">AI đang phân tích câu hỏi…</div>
              <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-linear" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-xs text-slate-500">Thường mất vài giây đến nửa phút.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500" role="status">
              <Loader2 size={16} className="animate-spin" /> Đang tải…
            </div>
          ))}

        {phase === "error" && (
          <div className="space-y-3">
            <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
            <Button variant="primary" onClick={() => void load()}>
              Thử lại
            </Button>
          </div>
        )}

        {phase === "done" && <Markdown>{content}</Markdown>}
      </div>

      {phase === "done" && (
        <footer className="shrink-0 border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          Lời giải do AI tạo, có thể chưa hoàn toàn chính xác. Thấy đáp án sai? Dùng nút “Báo cáo”.
        </footer>
      )}
    </aside>
  );
}
