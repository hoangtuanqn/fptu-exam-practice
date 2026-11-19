import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";

interface Props {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit?: () => void; // có khi được phép nộp bài; ở câu cuối nút "Tiếp" đổi thành "Nộp bài"
}

// Trước / Tiếp xếp dọc ngay dưới các nút đáp án (máy tính): chọn xong bấm luôn, không phải đưa chuột lên góc trên.
// Phím tắt tương ứng: ← → (Enter ở câu cuối là Nộp bài).
export function NavButtons({ hasPrev, hasNext, onPrev, onNext, onSubmit }: Props) {
  return (
    <div className="mt-2 flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-outline-variant pt-2">
      <IconButton label="Câu trước (←)" variant="tonal" onClick={onPrev} disabled={!hasPrev}>
        <ChevronLeft size={20} />
      </IconButton>
      {!hasNext && onSubmit ? (
        <IconButton label="Nộp bài (Enter)" variant="filled" onClick={onSubmit}>
          <Send size={18} />
        </IconButton>
      ) : (
        <IconButton label="Câu tiếp (→)" variant="filled" onClick={onNext} disabled={!hasNext}>
          <ChevronRight size={20} />
        </IconButton>
      )}
    </div>
  );
}
