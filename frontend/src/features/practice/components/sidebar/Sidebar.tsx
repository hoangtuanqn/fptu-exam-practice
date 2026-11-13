import { useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import { Legend } from "./Legend";
import { QuestionGrid } from "./QuestionGrid";

// Thanh "Câu 5 / 40" bám đầu vùng làm bài; bấm vào mở bảng số câu (popup) để nhảy tới câu bất kỳ, chọn xong tự đóng.
// Bên phải là số câu đã làm (sau khi nộp bài: số câu đúng).
export function Sidebar({ quiz }: { quiz: Quiz }) {
  const [open, setOpen] = useState(false);
  useKeydown((e) => open && e.key === "Escape" && setOpen(false));

  const count = Math.max(quiz.total, quiz.questions.length);
  const done = quiz.result ? quiz.result.correct : Object.values(quiz.answers).filter((a) => a.length > 0).length;

  return (
    <nav aria-label="Câu hỏi" className="sticky top-0 z-10 mb-2 shrink-0">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-low px-3 py-1.5 shadow-sm">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="md-state md-label-large inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-on-surface"
        >
          <LayoutGrid size={16} />
          Câu {quiz.current + 1} / {count}
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <span className="md-label-large tabular-nums text-on-surface-variant">{quiz.result ? `Đúng ${done}` : `Đã làm ${done}`}</span>
      </div>

      {open && (
        <>
          <button aria-label="Đóng danh sách câu" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" tabIndex={-1} />
          <div className="absolute inset-x-0 top-full z-20 mt-2 space-y-3 rounded-2xl border border-outline-variant bg-surface p-3 shadow-lg sm:max-w-lg">
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
