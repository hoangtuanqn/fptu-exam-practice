import { Bookmark, BookmarkCheck, Tag } from "lucide-react";
import type { Question } from "@/features/practice/types";
import { IconButton } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

interface Props {
  q: Question;
  showAnswer: boolean; // đã kiểm tra đề có đáp án thật và người dùng bật "Hiện đáp án"
  highlighted: boolean;
  saved?: boolean;
  onToggleSave?: () => void; // chỉ có khi đã đăng nhập
}

// Một câu của trang xem đề: số câu, chủ đề, ảnh, đáp án và nút lưu (không chọn đáp án, không chấm)
export function ViewQuestionCard({ q, showAnswer, highlighted, saved, onToggleSave }: Props) {
  const correct = q.correct ?? [];
  return (
    <li id={`q-${q.number}`} className="scroll-mt-20 md:scroll-mt-36">
      <Card className={`md-motion overflow-hidden ${highlighted ? "ring-2 ring-primary" : ""}`}>
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="md-title-medium shrink-0 text-on-surface">Câu {q.number}</span>
          {q.topic && (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-900" title={`Chủ đề: ${q.topic}`}>
              <Tag size={12} className="shrink-0 text-brand-700" />
              <span className="truncate font-medium">{q.topic}</span>
            </span>
          )}
          {onToggleSave && (
            <IconButton label={saved ? `Bỏ lưu câu ${q.number}` : `Lưu câu ${q.number}`} selected={saved} onClick={onToggleSave} className="ml-auto">
              {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </IconButton>
          )}
        </div>
        {q.imageUrl && <img src={q.imageUrl} alt={`Câu ${q.number}`} loading="lazy" className="h-auto w-full border-y border-outline-variant bg-surface-container-lowest" />}
        {showAnswer && correct.length > 0 && (
          <p className="md-body-medium px-4 py-2 text-on-surface">
            Đáp án: <b>{correct.join(" ")}</b>
          </p>
        )}
      </Card>
    </li>
  );
}
