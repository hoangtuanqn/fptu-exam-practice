import { ChevronLeft, ChevronRight, Maximize2, MessageSquareWarning, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/Button";
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
  onReport,
  reported,
  onExplain,
  explainBought,
  onChoose,
  onCheck,
  onPrev,
  onNext,
  onZoom,
}: Props) {
  const { number, imageUrl } = question;

  return (
    <div className="flex min-h-[360px] w-full flex-1 sm:min-h-[480px] animate-fade-in flex-col gap-2">
      {/* Đề bài: thông tin + công cụ ở trên, ảnh ngay dưới */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="whitespace-nowrap text-lg font-semibold text-slate-900">
              Câu {number} <span className="font-sans text-sm font-normal text-slate-400">/ {total}</span>
            </h2>
            <QuestionKindBadge question={question} />
          </div>
          <div className="flex items-center gap-2">
            <FlagButton flagged={flagged} onToggle={onToggleFlag} />
            {onExplain && (
              <button
                onClick={onExplain}
                title="Giải thích bằng AI"
                aria-label="Giải thích bằng AI"
                className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 p-2 text-xs font-medium text-brand-800 transition hover:border-brand-400 sm:px-2.5 sm:py-1"
              >
                <Sparkles size={13} />
                <span className="hidden sm:inline">{explainBought ? "Xem giải thích" : "Giải thích"}</span>
              </button>
            )}
            {onReport && (
              <button
                onClick={onReport}
                disabled={reported}
                title="Báo cáo đáp án sai"
                aria-label="Báo cáo đáp án sai"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white p-2 text-xs font-medium text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:text-slate-500 sm:px-2.5 sm:py-1"
              >
                <MessageSquareWarning size={13} />
                <span className="hidden sm:inline">{reported ? "Đã báo cáo" : "Báo cáo"}</span>
              </button>
            )}
            <button
              onClick={onZoom}
              title="Phóng to ảnh"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white p-2 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700 sm:px-2.5 sm:py-1"
              aria-label="Phóng to ảnh"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">Phóng to</span>
            </button>
          </div>
        </div>

        {/* Ảnh kéo giãn lấp đầy khung; bấm vào ảnh cũng mở cửa sổ phóng to */}
        <button onClick={onZoom} className="relative min-h-0 w-full flex-1 cursor-zoom-in bg-slate-50" tabIndex={-1}>
          <img src={imageUrl} alt={`Câu ${number}`} className="absolute inset-0 h-full w-full object-contain p-2" />
        </button>
      </section>

      {/* Thanh trả lời. Điện thoại: hàng đáp án (4 cột, nút to dễ chạm), trạng thái, rồi hai nút Trước/Tiếp ngang bằng nhau.
          Máy tính: một hàng Trước | đáp án + trạng thái | Tiếp (sm:contents làm hai nút nhập vào hàng cùng cấp). */}
      <section className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-3 sm:py-2">
        <div className="order-2 grid grid-cols-2 gap-2 sm:contents">
          <Button size="sm" onClick={onPrev} disabled={!hasPrev} className="!py-3 sm:order-1 sm:!py-2">
            <ChevronLeft size={16} />
            Trước
          </Button>
          <Button variant="primary" size="sm" onClick={onNext} disabled={!hasNext} className="!py-3 sm:order-3 sm:!py-2">
            Tiếp
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="order-1 flex flex-1 flex-col items-stretch gap-2.5 sm:order-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-4 sm:gap-y-2">
          <AnswerOptions compact question={question} selected={selected} revealed={revealed} onChoose={onChoose} />
          <AnswerStatus
            question={question}
            selected={selected}
            revealed={revealed}
            canCheck={canCheck}
            onCheck={onCheck}
          />
        </div>
      </section>
    </div>
  );
}
