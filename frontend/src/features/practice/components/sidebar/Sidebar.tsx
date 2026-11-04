import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { Legend } from "./Legend";
import { ProgressSummary } from "./ProgressSummary";
import { QuestionGrid } from "./QuestionGrid";

// Máy tính: cột hẹp bên trái (240px). Điện thoại: dải ngang phía trên, không chiếm chỗ của ảnh.
export function Sidebar({ quiz }: { quiz: Quiz }) {
  return (
    <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white lg:w-60 lg:border-b-0 lg:border-r">
      <ProgressSummary
        questions={quiz.questions}
        answers={quiz.answers}
        checked={quiz.checked}
        mode={quiz.mode}
        result={quiz.result}
        total={quiz.total}
      />
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
      <Legend mode={quiz.mode} submitted={quiz.submitted} />
    </aside>
  );
}
