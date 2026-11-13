import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { QuestionGrid } from "./QuestionGrid";

// Thẻ số câu gọn, luôn hiện để bấm nhảy câu, nằm trên đề và bám đầu vùng làm bài (không chiếm bề ngang).
// Bên trái là số câu đã làm (sau khi nộp bài: số câu đúng).
export function Sidebar({ quiz }: { quiz: Quiz }) {
  const count = Math.max(quiz.total, quiz.questions.length);
  const done = quiz.result ? quiz.result.correct : Object.values(quiz.answers).filter((a) => a.length > 0).length;
  return (
    <nav aria-label="Câu hỏi" className="sticky top-0 z-10 mb-2 flex shrink-0 items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-low px-3 shadow-sm">
      <span title={quiz.result ? "Số câu đúng" : "Số câu đã làm"} className="md-label-large shrink-0 tabular-nums text-on-surface-variant">
        {done}/{count}
      </span>
      <span aria-hidden className="h-5 w-px shrink-0 bg-outline-variant" />
      <QuestionGrid
        questions={quiz.questions}
        answers={quiz.answers}
        checked={quiz.checked}
        flagged={quiz.flagged}
        submitted={quiz.submitted}
        current={quiz.current}
        total={quiz.total}
        onSelect={quiz.goTo}
      />
    </nav>
  );
}
