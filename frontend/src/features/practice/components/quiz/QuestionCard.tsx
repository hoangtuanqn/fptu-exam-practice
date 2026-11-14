import type { ReactNode } from "react";
import { ChevronLeft, Sparkles, Tag } from "lucide-react";
import { useQuestionImageScale } from "@/features/practice/hooks/useQuestionImageScale";
import { isMultiple } from "@/features/practice/utils/question";
import { Button } from "@/shared/ui/Button";
import { AnswerOptions } from "./AnswerOptions";
import { AnswerStatus } from "./AnswerStatus";
import { ExplainButton } from "./ExplainButton";
import { NextButton } from "./NextButton";
import { QuestionKindBadge } from "./QuestionKindBadge";
import { QuestionToolsMenu } from "./QuestionToolsMenu";
import type { QuestionViewProps } from "./types";

interface Props extends QuestionViewProps {
  onZoom: () => void;
  nudge?: ReactNode; // thanh mời giữa ảnh đề và thanh trả lời (ví dụ mời xem giải thích khi làm sai)
  topic?: string | null; // chủ đề của câu, hiện trên đầu câu (luyện tập: luôn hiện; thi: sau khi nộp bài)
  topicLoading?: boolean; // chủ đề đang được gắn nền: hiện chip chờ có hiệu ứng thay cho chủ đề
}

// Bố cục gọn: [một hàng đầu: số câu, chủ đề, kết quả | giải thích AI, menu công cụ, Trước, Tiếp] / [ảnh đề — chiếm hết chỗ còn lại].
// Đáp án A–H nằm ở thanh dọc dưới nút danh sách câu (màn rộng) hoặc hàng ngay dưới đầu câu (màn nhỏ).
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
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-surface-container-lowest shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-slate-200 px-3 py-1.5 sm:px-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="whitespace-nowrap text-base font-semibold text-slate-900">
              Câu {number} <span className="font-sans text-sm font-normal text-slate-400">/ {total}</span>
            </h2>
            {/* Chỉ báo "Chọn nhiều" (hoặc chưa biết) cho khỏi chọn thiếu; câu chọn một thì khỏi nhắc */}
            {(question.answerPending || isMultiple(question)) && <QuestionKindBadge question={question} short />}
            {topic ? (
              <span className="inline-flex min-w-0 max-w-[16rem] items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-900" title={`Chủ đề: ${topic}`}>
                <Tag size={12} className="shrink-0 text-brand-700" />
                <span className="truncate font-medium">{topic}</span>
              </span>
            ) : (
              topicLoading && (
                <span role="status" className="topic-scan inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-slate-500">
                  <Sparkles size={12} className="shrink-0 animate-pulse text-brand-700" />
                  Đang phân loại chủ đề…
                </span>
              )
            )}
            {/* Nút Xác nhận / kết quả đúng sai hiện ngay đầu câu khi cần */}
            {(canCheck || revealed) && <AnswerStatus question={question} selected={selected} revealed={revealed} canCheck={canCheck} onCheck={onCheck} />}
          </div>
          <div className="flex items-center gap-1.5">
            {onExplain && <ExplainButton onExplain={onExplain} bought={explainBought} free={explainFree} />}
            <QuestionToolsMenu flagged={flagged} onToggleFlag={onToggleFlag} onZoom={onZoom} onReport={onReport} reported={reported} size={size} />
            <Button size="sm" onClick={onPrev} disabled={!hasPrev} aria-label="Câu trước" className="!min-h-9 !px-2.5 sm:!px-3">
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Trước</span>
            </Button>
            <NextButton hasNext={hasNext} onNext={onNext} onSubmit={onSubmit} className="!min-h-9 !px-2.5 sm:!px-3" />
          </div>
        </div>

        {/* Điện thoại và máy tính bảng: hàng đáp án ngay dưới đầu câu; màn rộng (lg) đáp án nằm ở thanh dọc dưới nút danh sách câu */}
        <div className="shrink-0 border-b border-slate-200 px-3 py-1.5 lg:hidden">
          <AnswerOptions dense question={question} selected={selected} revealed={revealed} onChoose={onChoose} />
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
    </div>
  );
}
