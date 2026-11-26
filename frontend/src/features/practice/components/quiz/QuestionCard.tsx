import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { useContentCrop } from "@/features/practice/hooks/useContentCrop";
import type { CSSProperties, ReactNode } from "react";
import { Bookmark, ChevronLeft, Flag, Sparkles, Tag } from "lucide-react";
import { useQuestionImageScale } from "@/features/practice/hooks/useQuestionImageScale";
import { isMultiple } from "@/features/practice/utils/question";
import { Button } from "@/shared/ui/Button";
import { AnswerOptions } from "./AnswerOptions";
import { AnswerBanner, RevealButton } from "./FlashcardAnswer";
import { AnswerStatus } from "./AnswerStatus";
import { ExplainButton } from "./ExplainButton";
import { RotateHint } from "@/shared/ui/RotateHint";
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

// Máy tính (lg trở lên): một hàng đầu [số câu, chủ đề, kết quả | giải thích AI, menu công cụ] và ảnh đề chiếm hết chỗ còn lại;
// đáp án A–H cùng nút Trước / Tiếp nằm ở thanh dọc dưới nút danh sách câu (Sidebar).
// Điện thoại và máy tính bảng: hàng đầu chỉ còn chủ đề + giải thích AI + menu (một dòng, số câu đã có ở nút danh sách câu phía trên),
// ảnh chiếm gần hết màn hình, còn đáp án và Trước/Tiếp nằm ở thanh dưới cùng tầm ngón cái.
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
  saved,
  onToggleSave,
  onReport,
  reported,
  onExplain,
  explainBought,
  explainFree,
  nudge,
  topic,
  topicLoading,
  autoNext,
  onToggleAutoNext,
  onChoose,
  onCheck,
  onPrev,
  onNext,
  onSubmit,
  flashcard,
  onZoom,
}: Props) {
  const { number, imageUrl } = question;
  const size = useQuestionImageScale();
  const crop = useContentCrop(imageUrl);
  const status = <AnswerStatus question={question} selected={selected} revealed={revealed} canCheck={canCheck} onCheck={onCheck} />;

  return (
    <div className="flex min-h-[360px] w-full flex-1 sm:min-h-[480px] animate-fade-in flex-col gap-2 land:min-h-0 land:gap-1">
      {/* Xoay ngang: nút công cụ thành cột bên phải để dành chiều cao cho ảnh đề (flashcard giữ dạng cột vì có dải đáp án dưới ảnh) */}
      <section className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-surface-container-lowest shadow-sm ${flashcard ? "" : "land:flex-row-reverse"}`}>
        <div className={`flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5 sm:px-4 lg:flex-wrap lg:gap-x-3 lg:gap-y-1.5 ${flashcard ? "" : "land:flex-col land:justify-start land:border-b-0 land:border-l land:px-1.5"}`}>
          <div className={`flex min-w-0 flex-1 items-center gap-x-3 gap-y-1 lg:flex-wrap ${flashcard ? "" : "land:max-w-12 land:flex-none land:text-center"}`}>
            <h2 className="hidden whitespace-nowrap text-base font-semibold text-slate-900 lg:block">
              Câu {number} <span className="font-sans text-sm font-normal text-slate-500">/ {total}</span>
            </h2>
            {/* Chỉ báo "Chọn nhiều" (hoặc chưa biết) cho khỏi chọn thiếu; câu chọn một thì khỏi nhắc */}
            {(question.answerPending || isMultiple(question)) && <QuestionKindBadge question={question} short />}
            {/* Máy tính: nút Xác nhận / kết quả đúng sai hiện ngay đầu câu khi cần */}
            {(canCheck || revealed) && <div className="hidden lg:block">{status}</div>}
          </div>
          <div className={`flex shrink-0 items-center gap-1.5 ${flashcard ? "" : "land:flex-col land:gap-2"}`}>
            {onExplain && <ExplainButton onExplain={onExplain} bought={explainBought} free={explainFree} />}
            {/* Lưu câu để ôn lại: nút riêng ngoài menu cho dễ thấy (trước đây nằm trong "…" nên nhiều người không biết là có) */}
            {onToggleSave && (
              <button
                type="button"
                onClick={onToggleSave}
                aria-pressed={!!saved}
                aria-label={saved ? "Bỏ lưu câu này" : "Lưu câu này để ôn lại"}
                title={saved ? "Bỏ lưu câu này" : "Lưu câu này để ôn lại (xem ở Câu đã lưu)"}
                className={`panel-q-tool ${
                  saved ? "border-primary bg-primary-container text-on-primary-container" : ""
                }`}
              >
                <Bookmark size={18} className={saved ? "fill-current" : ""} />
              </button>
            )}
            {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              aria-pressed={flagged}
              aria-label="Đánh dấu xem lại"
              title="Đánh dấu xem lại (M)"
              className={`panel-q-tool ${
                flagged ? "border-warning bg-warning-container text-on-warning-container" : ""
              }`}
            >
              <Flag size={18} className={flagged ? "fill-current" : ""} />
            </button>
            )}
            <QuestionToolsMenu onZoom={onZoom} onReport={onReport} reported={reported} autoNext={autoNext} onToggleAutoNext={onToggleAutoNext} size={size} original={crop.original} onToggleOriginal={crop.canCrop ? crop.toggleOriginal : undefined} />
          </div>
        </div>

        {/* Chủ đề của câu: một dòng chữ thường riêng ngay dưới thanh tiêu đề, rộng hết chiều ngang nên đọc được đủ cả trên điện thoại (tên dài thì xuống dòng, không cắt) */}
        {(topic || topicLoading) && (
          <div className="flex shrink-0 items-start gap-1.5 border-b border-slate-200 px-3 py-1.5 sm:px-4 land:hidden">
            {topic ? (
              <>
                <Tag size={13} aria-hidden className="mt-0.5 shrink-0 text-brand-700" />
                <p className="min-w-0 break-words text-[13px] leading-snug text-on-surface-variant">
                  <span className="font-medium text-on-surface">Chủ đề: </span>
                  {topic}
                </p>
              </>
            ) : (
              <p role="status" className="topic-scan inline-flex items-center gap-1.5 text-[13px] leading-snug text-on-surface-variant">
                <Sparkles size={13} aria-hidden className="shrink-0 animate-pulse text-brand-700" />
                Đang phân loại chủ đề…
              </p>
            )}
          </div>
        )}

        {/* Ảnh rộng hết khung (chữ to hơn nhiều so với co ảnh vừa cả chiều cao); đề dài thì cuộn trong khung. Bấm vào ảnh mở cửa sổ phóng to */}
        {/* Dưới 1024px: ảnh được cắt khoảng trắng (lớp q-crop trong panel.css) nên chữ to hơn; ảnh gốc không đổi */}
        <div className="min-h-0 w-full min-w-0 flex-1 overflow-auto bg-slate-50 p-1.5 sm:p-2 land:p-1 land:[container-type:size]">
          <div className="relative" style={{ width: `${size.scale * 100}%`, maxWidth: "none", "--crop-zoom": size.scale } as CSSProperties}>
            <div className={crop.style ? "q-crop" : undefined} style={crop.style ?? undefined}>
              <ProtectedImg
                src={imageUrl}
                alt={`Câu ${number}`}
                onLoad={crop.onLoad}
                onClick={flashcard ? flashcard.onToggle : onZoom}
                title={flashcard ? (flashcard.shown ? "Bấm để ẩn đáp án" : "Bấm để hiện đáp án") : "Bấm để mở cửa sổ phóng to"}
                className={`block h-auto w-full ${flashcard ? "cursor-pointer" : "cursor-zoom-in"}`}
              />
            </div>
          </div>
        </div>
        {/* Flashcard: đáp án nằm ngay dưới ảnh, chữ to, chiều cao cố định để bật/tắt không làm ảnh nhảy */}
        {flashcard && <AnswerBanner answer={question.correct} shown={flashcard.shown} />}
      </section>

      <RotateHint />

      {nudge}

      {/* Điện thoại và máy tính bảng: thanh dưới cùng tầm ngón cái: đáp án A–H rồi Trước | kết quả | Tiếp. Xoay ngang: chừa bên trái cho nút số câu (Sidebar đặt đè lên); đủ rộng thì gộp một hàng. */}
      <section className="shrink-0 space-y-2 rounded-xl border border-slate-200 bg-surface-container-lowest p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-sm lg:hidden land:space-y-1 land:py-1 landwide:flex landwide:items-center landwide:gap-2 landwide:space-y-0 landwide:pl-32">
        {!flashcard && (
          <AnswerOptions dense question={question} selected={selected} revealed={revealed} onChoose={onChoose} />
        )}
        <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 land:pl-32 landwide:flex landwide:pl-0 ${flashcard ? "landwide:flex-1 landwide:justify-between" : "landwide:shrink-0"}`}>
          <Button size="sm" onClick={onPrev} disabled={!hasPrev} aria-label="Câu trước" className="!min-h-11 !px-3">
            <ChevronLeft size={16} />
            <span className="landwide:hidden">Trước</span>
          </Button>
          <div className="flex min-h-10 min-w-0 items-center justify-center">{flashcard ? <RevealButton {...flashcard} className="w-full" /> : status}</div>
          <NextButton hasNext={hasNext} onNext={onNext} onSubmit={onSubmit} className="!min-h-11 !px-3" />
        </div>
      </section>
    </div>
  );
}
