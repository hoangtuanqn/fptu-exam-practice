import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import { Legend } from "./Legend";
import { QuestionGrid } from "./QuestionGrid";

// Nút nhỏ "Câu 5/40" (điện thoại: nằm ngang phía trên; máy tính: viên thuốc dọc ở mép trái, cách mép).
// Bấm vào thì bung ra bảng số câu lớn để nhảy tới câu bất kỳ, chọn xong tự đóng (bấm ra ngoài hoặc Esc cũng đóng).
export function Sidebar({ quiz }: { quiz: Quiz }) {
  const [open, setOpen] = useState(false);
  useKeydown((e) => open && e.key === "Escape" && setOpen(false));

  const count = Math.max(quiz.total, quiz.questions.length);
  const done = quiz.result ? quiz.result.correct : Object.values(quiz.answers).filter((a) => a.length > 0).length;

  return (
    <nav aria-label="Câu hỏi" className="relative z-10 shrink-0 px-2 pt-2 lg:px-0 lg:pb-4 lg:pl-4 lg:pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Danh sách câu"
        className="md-state md-label-medium inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-on-surface shadow-sm lg:flex-col lg:gap-1 lg:rounded-2xl lg:px-2.5 lg:py-3"
      >
        <LayoutGrid size={16} />
        <span className="tabular-nums lg:text-center">
          Câu {quiz.current + 1}
          <span className="lg:block">/{count}</span>
        </span>
      </button>

      {open && (
        <>
          <button aria-label="Đóng danh sách câu" onClick={() => setOpen(false)} className="fixed inset-0 cursor-default" tabIndex={-1} />
          <div className="absolute left-2 right-2 top-full z-10 mt-1 space-y-3 rounded-2xl border border-outline-variant bg-surface p-3 shadow-lg lg:left-full lg:right-auto lg:top-4 lg:ml-2 lg:mt-0 lg:w-[30rem]">
            <div className="md-label-large flex justify-between text-on-surface-variant">
              <span>Danh sách câu</span>
              <span className="tabular-nums">{quiz.result ? `Đúng ${done}/${count}` : `Đã làm ${done}/${count}`}</span>
            </div>
            <QuestionGrid
              questions={quiz.questions}
              answers={quiz.answers}
              checked={quiz.checked}
              flagged={quiz.flagged}
              submitted={quiz.submitted}
              current={quiz.current}
              total={quiz.total}
              onSelect={(i) => {
                quiz.goTo(i);
                setOpen(false);
              }}
            />
            <Legend mode={quiz.mode} submitted={quiz.submitted} />
          </div>
        </>
      )}
    </nav>
  );
}
