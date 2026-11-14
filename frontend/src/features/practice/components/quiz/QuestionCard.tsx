import type { ReactNode } from "react";
import { ChevronLeft, Maximize2, MessageSquareWarning, Sparkles, Tag, ZoomIn, ZoomOut } from "lucide-react";
import { useQuestionImageScale } from "@/features/practice/hooks/useQuestionImageScale";
import { Button } from "@/shared/ui/Button";
import { AnswerOptions } from "./AnswerOptions";
import { AnswerStatus } from "./AnswerStatus";
import { ExplainButton } from "./ExplainButton";
import { FlagButton } from "./FlagButton";
import { NextButton } from "./NextButton";
import { QuestionKindBadge } from "./QuestionKindBadge";
import type { QuestionViewProps } from "./types";

interface Props extends QuestionViewProps {
  onZoom: () => void;
  nudge?: ReactNode; // thanh mời giữa ảnh đề và thanh trả lời (ví dụ mời xem giải thích khi làm sai)
  topic?: string | null; // chủ đề của câu, hiện trên đầu câu (luyện tập: luôn hiện; thi: sau khi nộp bài)
  topicLoading?: boolean; // chủ đề đang được gắn nền: hiện thanh chờ có hiệu ứng thay cho chủ đề
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
  explainFree,
  nudge,
  topic,
  topicLoading,
  onChoose,
  onCheck,
  onPrev,
  onNext,
  onSubmit,
  onZoom,
}: Props) {
  const { number, imageUrl } = question;
  const size = useQuestionImageScale();

  return (
    <div className="flex min-h-[360px] w-full flex-1 sm:min-h-[480px] animate-fade-in flex-col gap-2">
      {/* Đề bài: thông tin + công cụ ở trên, ảnh ngay dưới */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-surface-container-lowest shadow-sm">
        {!topic && topicLoading && (
          <div role="status" className="topic-scan flex shrink-0 items-center gap-2 border-b border-slate-200 bg-brand-50 px-3 py-1.5 text-xs text-brand-900 sm:px-4">
            <Sparkles size={13} className="shrink-0 animate-pulse text-brand-700" />
            <span className="font-medium text-slate-500">Đang phân loại chủ đề cho câu này…</span>
          </div>
        )}
        {topic && (
          <div className="flex shrink-0 animate-fade-in items-center gap-2 border-b border-slate-200 bg-brand-50 px-3 py-1.5 text-xs text-brand-900 sm:px-4">
            <Tag size={13} className="shrink-0 text-brand-700" />
            <span className="font-medium text-slate-500">Chủ đề</span>
            <span className="min-w-0 truncate font-semibold">{topic}</span>
          </div>
        )}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="whitespace-nowrap text-lg font-semibold text-slate-900">
              Câu {number} <span className="font-sans text-sm font-normal text-slate-400">/ {total}</span>
            </h2>
            <QuestionKindBadge question={question} />
          </div>
          <div className="flex items-center gap-2">
            <FlagButton flagged={flagged} onToggle={onToggleFlag} />
            {onExplain && <ExplainButton onExplain={onExplain} bought={explainBought} free={explainFree} />}
            {onReport && (
              <button
                onClick={onReport}
                disabled={reported}
                title="Báo cáo đáp án sai"
                aria-label="Báo cáo đáp án sai"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-surface-container-lowest p-2 text-xs font-medium text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:text-slate-500 sm:px-2.5 sm:py-1"
              >
                <MessageSquareWarning size={13} />
                <span className="hidden sm:inline">{reported ? "Đã báo cáo" : "Báo cáo"}</span>
              </button>
            )}
            {/* Chỉnh cỡ chữ của đề ngay tại chỗ (nhớ cho lần sau), khỏi phải phóng to cả trình duyệt */}
            <div className="inline-flex items-center rounded-md border border-slate-200 bg-surface-container-lowest" role="group" aria-label="Cỡ ảnh đề">
              <button onClick={size.zoomOut} disabled={!size.canZoomOut} title="Thu nhỏ ảnh đề" aria-label="Thu nhỏ ảnh đề" className="flex h-9 w-9 items-center justify-center rounded-l-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent sm:h-7 sm:w-7">
                <ZoomOut size={15} />
              </button>
              <button onClick={size.reset} title="Về cỡ mặc định" aria-label={`Cỡ ảnh ${Math.round(size.scale * 100)}%, bấm để về mặc định`} className="hidden w-11 text-center text-xs tabular-nums text-slate-600 hover:bg-slate-100 sm:block">
                {Math.round(size.scale * 100)}%
              </button>
              <button onClick={size.zoomIn} disabled={!size.canZoomIn} title="Phóng to ảnh đề" aria-label="Phóng to ảnh đề" className="flex h-9 w-9 items-center justify-center rounded-r-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent sm:h-7 sm:w-7">
                <ZoomIn size={15} />
              </button>
            </div>
            <button
              onClick={onZoom}
              title="Phóng to ảnh"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-surface-container-lowest p-2 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700 sm:px-2.5 sm:py-1"
              aria-label="Phóng to ảnh"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">Phóng to</span>
            </button>
          </div>
        </div>

        {/* Ảnh rộng hết khung (chữ to hơn nhiều so với co ảnh vừa cả chiều cao); đề dài thì cuộn trong khung. Bấm vào ảnh mở cửa sổ phóng to */}
        <div className="min-h-0 w-full flex-1 overflow-auto bg-slate-50 p-2">
          <img
            src={imageUrl}
            alt={`Câu ${number}`}
            onClick={onZoom}
            title="Bấm để mở cửa sổ phóng to"
            className="block h-auto cursor-zoom-in"
            style={{ width: `${size.scale * 100}%`, maxWidth: "none" }}
          />
        </div>
      </section>

      {nudge}

      {/* Thanh trả lời. Điện thoại: hàng đáp án (4 cột, nút to dễ chạm), trạng thái, rồi hai nút Trước/Tiếp ngang bằng nhau.
          Máy tính: một hàng Trước | đáp án + trạng thái | Tiếp (sm:contents làm hai nút nhập vào hàng cùng cấp). */}
      <section className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-slate-200 bg-surface-container-lowest p-2.5 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-3 sm:py-2">
        <div className="order-2 grid grid-cols-2 gap-2 sm:contents">
          <Button size="sm" onClick={onPrev} disabled={!hasPrev} className="!py-3 sm:order-1 sm:!py-2">
            <ChevronLeft size={16} />
            Trước
          </Button>
          <NextButton hasNext={hasNext} onNext={onNext} onSubmit={onSubmit} className="!py-3 sm:order-3 sm:!py-2" />
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
