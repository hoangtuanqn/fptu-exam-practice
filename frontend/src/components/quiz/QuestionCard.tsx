import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "../ui/Button";
import { AnswerOptions } from "./AnswerOptions";
import { AnswerStatus } from "./AnswerStatus";
import { FlagButton } from "./FlagButton";
import { QuestionKindBadge } from "./QuestionKindBadge";
import type { QuestionViewProps } from "./types";

interface Props extends QuestionViewProps {
  onZoom: () => void;
}

// Bố cục: [thanh công cụ câu hỏi] / [ảnh đề — chiếm hết chỗ còn lại] / [thanh trả lời]
export function QuestionCard({
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
  onZoom,
}: Props) {
  const { number, imageUrl } = question;

  return (
    <div className="flex min-h-[480px] w-full flex-1 animate-fade-in flex-col gap-2">
      {/* Đề bài: thông tin + công cụ ở trên, ảnh ngay dưới */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-lg font-semibold text-slate-900">
              Câu {number} <span className="font-sans text-sm font-normal text-slate-400">/ {total}</span>
            </h2>
            <QuestionKindBadge question={question} />
          </div>
          <div className="flex items-center gap-2">
            <FlagButton flagged={flagged} onToggle={onToggleFlag} />
            <button
              onClick={onZoom}
              title="Phóng to ảnh"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
              <Maximize2 size={13} />
              Phóng to
            </button>
          </div>
        </div>

        {/* Ảnh kéo giãn lấp đầy khung; bấm vào ảnh cũng mở cửa sổ phóng to */}
        <button onClick={onZoom} className="relative min-h-0 w-full flex-1 cursor-zoom-in bg-slate-50" tabIndex={-1}>
          <img src={imageUrl} alt={`Câu ${number}`} className="absolute inset-0 h-full w-full object-contain p-2" />
        </button>
      </section>

      {/* Thanh trả lời: Trước | A–H + trạng thái | Tiếp. Chiều cao ổn định nên ảnh không bị co giật. */}
      <section className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <Button size="sm" onClick={onPrev} disabled={!hasPrev}>
          <ChevronLeft size={16} />
          Trước
        </Button>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <AnswerOptions compact question={question} selected={selected} revealed={revealed} onChoose={onChoose} />
          <AnswerStatus
            question={question}
            selected={selected}
            revealed={revealed}
            canCheck={canCheck}
            onCheck={onCheck}
          />
        </div>

        <Button variant="primary" size="sm" onClick={onNext} disabled={!hasNext}>
          Tiếp
          <ChevronRight size={16} />
        </Button>
      </section>
    </div>
  );
}
