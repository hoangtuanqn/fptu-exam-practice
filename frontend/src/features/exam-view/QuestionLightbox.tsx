import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, MessageSquare, X } from "lucide-react";
import { ZoomControls } from "@/features/practice/components/quiz/ZoomControls";
import { useImageZoom } from "@/features/practice/hooks/useImageZoom";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import type { Question } from "@/features/practice/types";
import { Button, IconButton } from "@/shared/ui/Button";

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export interface QuestionLightboxProps {
  questions: Question[]; // các câu hỏi của đề (không gồm tài liệu tham khảo)
  current: number; // số câu đang xem (không dùng vị trí: danh sách có thể đổi khi một câu thành tài liệu tham khảo)
  onCurrentChange: (number: number) => void;
  onClose: () => void;
  showAnswer: boolean;
  commentsSlot?: ReactNode; // khung bình luận của câu đang xem: máy tính là cột bên phải, điện thoại là tấm trượt từ dưới lên; không có thì không hiện
  commentCounts?: Record<number, number>; // số bình luận đã duyệt theo số câu; không có thì không hiện
}

// Cửa sổ xem lớn ảnh câu hỏi ở trang chi tiết đề: phóng to, câu trước/sau, phím mũi tên và Esc
export function QuestionLightbox({ questions, current, onCurrentChange, onClose, showAnswer, commentsSlot, commentCounts }: QuestionLightboxProps) {
  const zoom = useImageZoom(); // giữ mức phóng khi đổi câu
  const box = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState(false); // điện thoại: tấm bình luận đang mở
  const index = questions.findIndex((x) => x.number === current);
  const q = questions[index];
  const go = (i: number) => {
    const target = questions[i];
    if (target) onCurrentChange(target.number);
  };
  const hasPrev = index > 0;
  const hasNext = index < questions.length - 1;
  const count = q ? commentCounts?.[q.number] : undefined;

  // Mở: đưa focus vào cửa sổ, khoá cuộn trang phía sau; đóng: trả focus về chỗ đã bấm
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  useKeydown((e) => {
    if (e.key === "Escape") return sheet ? setSheet(false) : onClose();
    if (e.key === "Tab") {
      const items = Array.from(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return e.preventDefault();
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (typing(e.target)) return; // đang gõ bình luận: mũi tên là để di con trỏ
    if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === "ArrowRight") go(index + 1);
  });

  if (!q) return null;
  const correct = q.correct ?? [];

  return createPortal(
    <div ref={box} role="dialog" aria-modal="true" aria-label={`Câu ${q.number}`} tabIndex={-1} className="fixed inset-0 z-[60] flex flex-col bg-scrim/90 outline-none backdrop-blur-sm lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-3 text-white sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md-title-medium">
              Câu {q.number} <span className="md-body-small text-slate-300">({index + 1}/{questions.length})</span>
            </span>
            {count !== undefined && (
              <span className="md-label-medium inline-flex items-center gap-1 text-slate-300" title={`${count} bình luận`}>
                <MessageSquare size={14} aria-hidden /> {count}
              </span>
            )}
          </div>
          <ZoomControls zoom={zoom.zoom} canZoomIn={zoom.canZoomIn} canZoomOut={zoom.canZoomOut} onZoomIn={zoom.zoomIn} onZoomOut={zoom.zoomOut} onReset={zoom.reset} onClose={onClose} />
        </div>

        <div ref={zoom.scrollRef} onScroll={zoom.onScroll} className="relative isolate z-0 mx-3 min-h-0 flex-1 overflow-auto rounded-xl bg-surface-container-lowest p-2 sm:mx-5 sm:p-4">
          {/* m-auto: ảnh nhỏ nằm giữa, ảnh tràn khung vẫn cuộn tới được mọi phía */}
          <div className="flex min-h-full min-w-full">
            <img
              ref={zoom.imgRef}
              src={q.imageUrl}
              alt={`Câu ${q.number}`}
              onClick={zoom.toggleAt}
              onLoad={zoom.onImageLoad}
              className={`m-auto shrink-0 ${zoom.zoom <= 1 ? "cursor-zoom-in" : "cursor-zoom-out"}`}
              style={{ width: `${zoom.zoom * 100}%`, maxWidth: "none" }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 px-3 py-3 sm:px-5">
          <Button size="sm" variant="tonal" onClick={() => go(index - 1)} disabled={!hasPrev}>
            <ChevronLeft size={16} /> Trước
          </Button>
          <p className="md-body-medium min-w-0 flex-1 truncate text-center text-white">
            {showAnswer && correct.length > 0 && (
              <>
                Đáp án: <b>{correct.join(" ")}</b>
              </>
            )}
          </p>
          {commentsSlot && (
            <Button size="sm" variant="tonal" className="lg:hidden" onClick={() => setSheet(true)} aria-label={count !== undefined ? `Bình luận (${count})` : "Bình luận"}>
              <MessageSquare size={16} />
              {count !== undefined && count}
            </Button>
          )}
          <Button size="sm" variant="tonal" onClick={() => go(index + 1)} disabled={!hasNext}>
            Tiếp <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {commentsSlot && (
        <aside aria-label="Bình luận" className={`${sheet ? "fixed inset-x-0 bottom-0 z-10 flex max-h-[70dvh] rounded-t-m3-xl" : "hidden"} flex-col overflow-hidden bg-surface text-on-surface lg:static lg:flex lg:max-h-none lg:w-96 lg:rounded-none`}>
          <div className="flex items-center justify-between px-4 py-2 lg:hidden">
            <h2 className="md-title-medium">Bình luận</h2>
            <IconButton label="Đóng bình luận" onClick={() => setSheet(false)}>
              <X size={20} />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{commentsSlot}</div>
        </aside>
      )}
    </div>,
    document.body,
  );
}
