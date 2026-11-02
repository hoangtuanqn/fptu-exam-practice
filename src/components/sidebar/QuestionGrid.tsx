import { useEffect, useRef } from "react";
import type { Question, UserAnswers } from "../../types";
import { getStatus, type QuestionStatus } from "../../utils/grade";

interface Props {
  questions: Question[];
  answers: UserAnswers;
  checked: Record<number, boolean>;
  flagged: Record<number, boolean>;
  submitted: boolean;
  current: number;
  onSelect: (index: number) => void;
}

const STATUS_STYLE: Record<QuestionStatus, string> = {
  unanswered: "border-slate-300 bg-white text-slate-600 hover:border-slate-500",
  answered: "border-brand-900 bg-brand-900 text-white",
  correct: "border-emerald-600 bg-emerald-600 text-white",
  wrong: "border-rose-600 bg-rose-600 text-white",
  ungraded: "border-slate-300 bg-slate-100 text-slate-500",
};

// Lưới số câu: màu theo trạng thái, viền đậm ở câu đang xem
export function QuestionGrid({ questions, answers, checked, flagged, submitted, current, onSelect }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Chuyển câu bằng phím/nút thì cuộn để ô câu hiện tại luôn nằm trong tầm nhìn
  useEffect(() => {
    boxRef.current
      ?.querySelector<HTMLElement>('[data-current="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  return (
    // Điện thoại: một dải cuộn ngang. Máy tính: lưới 5 cột cuộn dọc.
    <div ref={boxRef} className="overflow-x-auto px-3 py-3 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:p-4">
      <div className="flex gap-2 lg:grid lg:grid-cols-5 lg:gap-1.5">
        {questions.map((q, i) => {
          const status = getStatus(q, answers[q.number], submitted || !!checked[q.number]);
          return (
            <button
              key={q.number}
              data-current={i === current}
              onClick={() => onSelect(i)}
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-medium transition lg:w-auto ${STATUS_STYLE[status]} ${
                i === current ? "ring-2 ring-brand-900 ring-offset-2" : ""
              }`}
            >
              {q.number}
              {flagged[q.number] && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
