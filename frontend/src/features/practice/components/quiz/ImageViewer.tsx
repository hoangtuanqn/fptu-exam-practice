import { ChevronLeft } from "lucide-react";
import { useImageZoom } from "@/features/practice/hooks/useImageZoom";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import { Button } from "@/shared/ui/Button";
import { ExamTimer } from "../ExamTimer";
import { AnswerOptions } from "./AnswerOptions";
import { AnswerStatus } from "./AnswerStatus";
import { FlagButton } from "./FlagButton";
import { NextButton } from "./NextButton";
import { QuestionKindBadge } from "./QuestionKindBadge";
import type { QuestionViewProps } from "./types";
import { ZoomControls } from "./ZoomControls";

interface Props extends QuestionViewProps {
  onClose: () => void;
  timer?: { left: number; limit: number }; // thi có giới hạn: cửa sổ này phủ kín thanh đầu trang nên phải tự hiện thời gian còn lại
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
  onSubmit,
  onClose,
  timer,
}: Props) {
  const zoom = useImageZoom(question.number); // đổi câu thì về 100%

  useKeydown((e) => e.key === "Escape" && onClose());

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-scrim/90 backdrop-blur-sm">
      {/* Thanh công cụ */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5 text-white">
        <div className="font-serif text-lg font-semibold">
          Câu {question.number} <span className="font-sans text-sm font-normal text-slate-400">/ {total}</span>
        </div>
        {timer && <ExamTimer left={timer.left} limit={timer.limit} onDark />}
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 sm:px-5 sm:pb-5">
        {/* Ảnh */}
        <div ref={zoom.scrollRef} className="min-h-0 flex-1 overflow-auto rounded-xl bg-surface-container-lowest p-4">
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

        {/* Thanh trả lời nằm dưới ảnh, cùng kiểu với màn hình làm bài. Điện thoại: đáp án trước, hai nút Trước/Tiếp ngang bằng nhau bên dưới.
            Máy tính: một hàng Trước | đáp án + trạng thái | Tiếp. Hai nút cùng cỡ (size sm) để không lệch nhau. */}
        <section className="flex max-h-[45dvh] shrink-0 flex-col gap-2.5 overflow-y-auto rounded-xl bg-surface-container-lowest p-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-4 sm:py-3">
          <div className="order-2 grid grid-cols-2 gap-2 sm:contents">
            <Button size="sm" onClick={onPrev} disabled={!hasPrev} className="!py-3 sm:order-1 sm:!py-2">
              <ChevronLeft size={16} />
              Trước
            </Button>
            <NextButton hasNext={hasNext} onNext={onNext} onSubmit={onSubmit} className="!py-3 sm:order-3 sm:!py-2" />
          </div>

          <div className="order-1 flex flex-1 flex-col items-stretch gap-2.5 sm:order-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-4 sm:gap-y-2">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <QuestionKindBadge question={question} short />
              <FlagButton flagged={flagged} onToggle={onToggleFlag} />
            </div>
            <AnswerOptions compact question={question} selected={selected} revealed={revealed} onChoose={onChoose} />
            <AnswerStatus question={question} selected={selected} revealed={revealed} canCheck={canCheck} onCheck={onCheck} />
          </div>
        </section>
      </div>
    </div>
  );
}
