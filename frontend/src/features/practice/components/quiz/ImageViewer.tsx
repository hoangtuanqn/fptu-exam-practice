import { ChevronLeft, ChevronRight } from "lucide-react";
import { useImageZoom } from "@/features/practice/hooks/useImageZoom";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import { Button } from "@/shared/ui/Button";
import { AnswerOptions } from "./AnswerOptions";
import { AnswerStatus } from "./AnswerStatus";
import { FlagButton } from "./FlagButton";
import { QuestionKindBadge } from "./QuestionKindBadge";
import type { QuestionViewProps } from "./types";
import { ZoomControls } from "./ZoomControls";

interface Props extends QuestionViewProps {
  onClose: () => void;
}

// Cửa sổ phóng to ảnh đề, bên cạnh có khu vực chọn đáp án
export function ImageViewer({
  question,
  total,
  selected,
  revealed,
  canCheck,
  hasPrev,
  hasNext,
  flagged,
  onToggleFlag,
  onChoose,
  onCheck,
  onPrev,
  onNext,
  onClose,
}: Props) {
  const zoom = useImageZoom(question.number); // đổi câu thì về 100%

  useKeydown((e) => e.key === "Escape" && onClose());

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-900/90 backdrop-blur-sm">
      {/* Thanh công cụ */}
      <div className="flex h-14 shrink-0 items-center justify-between px-5 text-white">
        <div className="font-serif text-lg font-semibold">
          Câu {question.number} <span className="font-sans text-sm font-normal text-slate-400">/ {total}</span>
        </div>
        <ZoomControls
          zoom={zoom.zoom}
          canZoomIn={zoom.canZoomIn}
          canZoomOut={zoom.canZoomOut}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onReset={zoom.reset}
          onClose={onClose}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5 lg:flex-row">
        {/* Ảnh */}
        <div ref={zoom.scrollRef} className="min-h-0 flex-1 overflow-auto rounded-xl bg-white p-4">
          {/* m-auto thay cho justify-center: ảnh nhỏ thì nằm giữa, ảnh tràn khung thì vẫn cuộn tới được mọi phía */}
          <div className="flex min-h-full min-w-full">
            <img
              ref={zoom.imgRef}
              src={question.imageUrl}
              alt={`Câu ${question.number}`}
              onClick={zoom.toggleAt}
              title={zoom.zoom <= 1 ? "Bấm để phóng to" : "Bấm để thu nhỏ"}
              className={`m-auto ${zoom.zoom <= 1 ? "cursor-zoom-in" : "cursor-zoom-out"}`}
              style={{ width: `${zoom.zoom * 100}%`, maxWidth: "none" }}
            />
          </div>
        </div>

        {/* Đáp án */}
        <aside className="flex shrink-0 flex-col rounded-xl bg-white p-5 lg:w-80">
          <div className="flex items-center justify-between">
            <QuestionKindBadge question={question} short />
            <FlagButton flagged={flagged} onToggle={onToggleFlag} />
          </div>
          <div className="mt-4 space-y-3">
            <AnswerOptions question={question} selected={selected} revealed={revealed} onChoose={onChoose} />
            <AnswerStatus
              question={question}
              selected={selected}
              revealed={revealed}
              canCheck={canCheck}
              onCheck={onCheck}
            />
          </div>

          <div className="mt-5 flex gap-2 lg:mt-auto">
            <Button grow onClick={onPrev} disabled={!hasPrev}>
              <ChevronLeft size={16} />
              Trước
            </Button>
            <Button grow variant="primary" onClick={onNext} disabled={!hasNext}>
              Tiếp
              <ChevronRight size={16} />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
