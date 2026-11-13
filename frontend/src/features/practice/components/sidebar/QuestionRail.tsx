import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { QuestionGrid } from "./QuestionGrid";

// Máy tính: thanh số câu dọc dạng thẻ bo tròn, cách mép màn hình, luôn thấy và bấm nhảy câu được; cuộn dọc khi nhiều câu.
// Bên trên là số câu đã làm (sau khi nộp bài: số câu đúng). Điện thoại dùng nút popup trong Sidebar.
export function QuestionRail({ quiz }: { quiz: Quiz }) {
  const count = Math.max(quiz.total, quiz.questions.length);
  const done = quiz.result ? quiz.result.correct : Object.values(quiz.answers).filter((a) => a.length > 0).length;
  return (
    <nav aria-label="Câu hỏi" className="hidden min-h-0 shrink-0 py-4 pl-4 lg:flex">
      <div className="flex max-h-full w-16 flex-col items-center rounded-2xl border border-outline-variant bg-surface-container-low pt-2 shadow-sm">
        <span title={quiz.result ? "Số câu đúng" : "Số câu đã làm"} className="md-label-medium tabular-nums text-on-surface-variant">
          {done}/{count}
        </span>
        <QuestionGrid
          vertical
          questions={quiz.questions}
          answers={quiz.answers}
          checked={quiz.checked}
          flagged={quiz.flagged}
          submitted={quiz.submitted}
          current={quiz.current}
          total={quiz.total}
          onSelect={quiz.goTo}
        />
      </div>
    </nav>
  );
}
