import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { QuestionGrid } from "./QuestionGrid";

// Dải số câu gọn, luôn hiện để bấm nhảy câu: điện thoại là một hàng ngang phía trên, máy tính là cột hẹp bên trái.
// Bên cạnh là số câu đã làm (sau khi nộp bài: số câu đúng).
export function Sidebar({ quiz }: { quiz: Quiz }) {
  const count = Math.max(quiz.total, quiz.questions.length);
  const done = quiz.result ? quiz.result.correct : Object.values(quiz.answers).filter((a) => a.length > 0).length;
  return (
    <aside className="flex min-w-0 shrink-0 items-center border-b border-outline-variant bg-surface pl-2 lg:w-14 lg:flex-col lg:border-b-0 lg:border-r lg:px-0 lg:pt-2">
      <span title={quiz.result ? "Số câu đúng" : "Số câu đã làm"} className="md-label-medium shrink-0 tabular-nums text-on-surface-variant">
        {done}/{count}
      </span>
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
    </aside>
  );
}
