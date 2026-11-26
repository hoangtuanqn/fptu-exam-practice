import { useState, type ReactNode } from "react";
import { ChevronsRight, Image as ImageIcon, Maximize2, MessageSquareWarning, MoreHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import type { useQuestionImageScale } from "@/features/practice/hooks/useQuestionImageScale";

interface Props {
  onZoom: () => void;
  onReport?: () => void; // chỉ có khi đã có kết quả của câu và người dùng đã đăng nhập
  reported?: boolean;
  autoNext?: boolean;
  onToggleAutoNext?: () => void; // chỉ có ở chế độ Thi
  size: ReturnType<typeof useQuestionImageScale>;
  original?: boolean; // đang xem ảnh gốc (không cắt khoảng trắng)
  onToggleOriginal?: () => void; // chỉ có khi ảnh này cắt được
}

// Các công cụ phụ của câu hỏi gom vào một nút "…" cho khu vực làm bài gọn: phóng to ảnh, cỡ ảnh, báo cáo đáp án sai.
// (Đánh dấu xem lại và Lưu câu dùng thường xuyên nên có nút riêng ngoài menu.)
export function QuestionToolsMenu({ onZoom, onReport, reported, autoNext, onToggleAutoNext, size, original, onToggleOriginal }: Props) {
  const [open, setOpen] = useState(false);
  useKeydown((e) => open && e.key === "Escape" && setOpen(false));
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Công cụ khác của câu hỏi"
        title="Phóng to, cỡ ảnh, báo cáo"
        className="panel-q-tool"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Đóng menu" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" tabIndex={-1} />
          <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-64 space-y-0.5 rounded-xl border border-outline-variant bg-surface p-1.5 shadow-lg land:fixed land:right-14 land:top-12 land:mt-0 land:max-h-[calc(100dvh-4rem)] land:overflow-y-auto">
            <Item icon={<Maximize2 size={16} />} label="Mở cửa sổ phóng to ảnh" onClick={run(onZoom)} />
            {onToggleAutoNext && <Item icon={<ChevronsRight size={16} className={autoNext ? "text-primary" : ""} />} label="Tự sang câu sau khi chọn" state={autoNext ? "Bật" : "Tắt"} checked={!!autoNext} onClick={run(onToggleAutoNext)} />}
            <div role="group" aria-label="Cỡ ảnh đề" className="flex items-center gap-1 px-2.5 py-1.5">
              <span className="flex-1 text-sm text-slate-700">Cỡ ảnh đề</span>
              <button type="button" onClick={size.zoomOut} disabled={!size.canZoomOut} aria-label="Thu nhỏ ảnh đề" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent">
                <ZoomOut size={16} />
              </button>
              <button type="button" onClick={size.reset} title="Về cỡ mặc định" className="w-12 rounded-md py-1.5 text-center text-sm tabular-nums text-slate-700 hover:bg-slate-100">
                {Math.round(size.scale * 100)}%
              </button>
              <button type="button" onClick={size.zoomIn} disabled={!size.canZoomIn} aria-label="Phóng to ảnh đề" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent">
                <ZoomIn size={16} />
              </button>
            </div>
            {onToggleOriginal && (
              <div className="lg:hidden">
                <Item icon={<ImageIcon size={16} />} label="Xem ảnh gốc" state={original ? "Bật" : "Tắt"} checked={!!original} onClick={run(onToggleOriginal)} />
              </div>
            )}
            {onReport && <Item icon={<MessageSquareWarning size={16} />} label={reported ? "Đã báo cáo đáp án" : "Báo cáo đáp án sai"} disabled={reported} onClick={run(onReport)} />}
          </div>
        </>
      )}
    </div>
  );
}

function Item({ icon, label, hint, state, checked, disabled, onClick }: { icon: ReactNode; label: string; hint?: string; state?: string; checked?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" role={checked === undefined ? "menuitem" : "menuitemcheckbox"} aria-checked={checked} onClick={onClick} disabled={disabled} className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent">
      <span className="shrink-0 text-slate-500">{icon}</span>
      <span className="flex-1">{label}</span>
      {state && <span className={`text-xs font-semibold ${checked ? "text-primary" : "text-slate-500"}`}>{state}</span>}
      {hint && <kbd className="rounded border border-slate-200 px-1.5 text-xs text-slate-500">{hint}</kbd>}
    </button>
  );
}
