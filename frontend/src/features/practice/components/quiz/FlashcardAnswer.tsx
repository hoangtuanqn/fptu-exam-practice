import { Eye, EyeOff } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";

// Flashcard: không chọn A–H mà bấm "Hiện đáp án" để xem đáp án đúng (dùng chung cho cột trái, thanh dưới và cửa sổ phóng to ảnh)
export interface FlashcardView {
  shown: boolean;
  onToggle: () => void;
}

export function RevealButton({ shown, onToggle, iconOnly = false, className = "" }: FlashcardView & { iconOnly?: boolean; className?: string }) {
  const label = shown ? "Ẩn đáp án" : "Hiện đáp án";
  if (iconOnly)
    return (
      <IconButton label={`${label} (Space)`} variant={shown ? "tonal" : "filled"} onClick={onToggle}>
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </IconButton>
    );
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={shown}
      className={`md-state md-motion flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2 shadow-sm ${shown ? "bg-primary-container text-on-primary-container" : "bg-primary text-on-primary"} ${className}`}
    >
      {shown ? <EyeOff size={18} className="shrink-0" /> : <Eye size={18} className="shrink-0" />}
      <span className="md-label-large">{label}</span>
    </button>
  );
}

// Các chữ cái đáp án đúng; chưa hiện thì để chỗ trống (hàng ngang: có dòng nhắc)
export function AnswerLetters({ answer, shown, vertical = false }: { answer: string[]; shown: boolean; vertical?: boolean }) {
  if (!shown) return vertical ? null : <p className="md-body-small text-on-surface-variant">Bấm "Hiện đáp án" hoặc bấm vào ảnh để xem đáp án.</p>;
  if (answer.length === 0) return <p className="md-body-small text-center text-on-surface-variant">Chưa có đáp án</p>;
  return (
    <div aria-live="polite" className={vertical ? "flex flex-col items-center gap-1" : "flex flex-wrap items-center justify-center gap-2"}>
      {answer.map((a) => (
        <span key={a} className={`md-title-medium flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-on-primary ${vertical ? "h-10 w-10" : "h-9 w-9"}`}>
          {a}
        </span>
      ))}
    </div>
  );
}

// Dải đáp án dưới ảnh: chữ cái to trên nền nổi bật; chưa hiện thì giữ nguyên chiều cao và nhắc cách xem
export function AnswerBanner({ answer, shown }: { answer: string[]; shown: boolean }) {
  return (
    <section
      aria-label="Đáp án"
      aria-live="polite"
      className={`flex min-h-[4.5rem] shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t-2 px-4 py-2.5 ${shown ? "border-primary bg-primary-container text-on-primary-container" : "border-slate-200 bg-surface-container-lowest text-on-surface-variant"}`}
    >
      {!shown ? (
        <p className="md-body-medium">Bấm vào ảnh hoặc nút "Hiện đáp án" để xem đáp án</p>
      ) : answer.length === 0 ? (
        <p className="md-title-small">Câu này chưa có đáp án</p>
      ) : (
        <>
          <span className="md-label-large uppercase tracking-wide">Đáp án đúng{answer.length > 1 ? ` · chọn ${answer.length}` : ""}</span>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {answer.map((a) => (
              <span key={a} className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-bold text-on-primary shadow-md ring-4 ring-primary/25">
                {a}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
