import { useEffect, useRef } from "react";
import type { Question, UserAnswers } from "@/features/practice/types.ts";
import { getStatus, type QuestionStatus } from "@/features/practice/utils/grade";

interface Props {
  questions: Question[];
  answers: UserAnswers;
  checked: Record<number, boolean>;
  flagged: Record<number, boolean>;
  submitted: boolean;
  current: number;
  total?: number; // tổng số câu của đề; chưa tải xong thì các ô còn lại hiện mờ
  onSelect: (index: number) => void;
}

// Màu theo vai trò M3; mỗi trạng thái còn có tên đọc cho trình đọc màn hình nên không chỉ dựa vào màu
const STATUS_STYLE: Record<QuestionStatus, { cls: string; name: string }> = {
  unanswered: { cls: "border-outline text-on-surface", name: "chưa làm" },
  answered: { cls: "border-transparent bg-secondary-container text-on-secondary-container", name: "đã làm" },
  correct: { cls: "border-transparent bg-success-container text-on-success-container", name: "đúng" },
  wrong: { cls: "border-transparent bg-error-container text-on-error-container", name: "sai" },
  ungraded: { cls: "border-outline-variant bg-surface-container-high text-on-surface-variant", name: "chưa có đáp án" },
};

// Dải số câu gọn nằm ngang: màu theo trạng thái, vòng primary ở câu đang xem (aria-current), cuộn ngang khi nhiều câu.
export function QuestionGrid({ questions, answers, checked, flagged, submitted, current, total = 0, onSelect }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Chuyển câu bằng phím/nút thì cuộn để ô câu hiện tại luôn nằm trong tầm nhìn
  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>('[data-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  return (
    <div ref={boxRef} className="min-w-0 flex-1 overflow-x-auto py-1">
      <div role="list" aria-label="Danh sách câu hỏi" className="flex gap-1.5 px-1">
        {questions.map((q, i) => {
          const status = getStatus(q, answers[q.number], submitted || !!checked[q.number]);
          const { cls, name } = STATUS_STYLE[status];
          return (
            <div role="listitem" key={q.number} className="shrink-0">
              <button
                data-current={i === current}
                aria-current={i === current ? "true" : undefined}
                title={`Câu ${q.number}: ${name}`}
                aria-label={`Câu ${q.number}, ${name}${flagged[q.number] ? ", đã đánh dấu" : ""}`}
                onClick={() => onSelect(i)}
                className={`md-state md-motion md-label-large relative flex h-9 w-9 items-center justify-center rounded-full border ${cls} ${
                  i === current ? "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low" : ""
                }`}
              >
                {q.number}
                {flagged[q.number] && <span aria-hidden className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-warning ring-2 ring-surface" />}
              </button>
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, total - questions.length) }, (_, k) => (
          <span
            key={`loading-${k}`}
            aria-hidden
            className="md-label-large flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full border border-dashed border-outline-variant text-outline"
          >
            {questions.length + k + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
