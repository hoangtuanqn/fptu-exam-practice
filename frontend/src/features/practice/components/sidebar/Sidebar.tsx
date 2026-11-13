import { useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import { Legend } from "./Legend";
import { QuestionGrid } from "./QuestionGrid";

// Điện thoại/máy tính bảng: nút nhỏ "Câu 5/40 · Đã làm 12" nhỏ gọn ở đầu vùng làm bài; bấm vào mở bảng số câu (popup) để nhảy tới câu bất kỳ, chọn xong tự đóng.
// Sau khi nộp bài, con số bên cạnh là số câu đúng.
export function Sidebar({ quiz }: { quiz: Quiz }) {
  const [open, setOpen] = useState(false);
  useKeydown((e) => open && e.key === "Escape" && setOpen(false));

  const count = Math.max(quiz.total, quiz.questions.length);
  const done = quiz.result ? quiz.result.correct : Object.values(quiz.answers).filter((a) => a.length > 0).length;

  return (
    <nav aria-label="Câu hỏi" className="sticky top-0 z-10 mb-1.5 shrink-0 lg:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="md-state md-label-medium inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-on-surface shadow-sm"
      >
        <LayoutGrid size={14} />
        Câu {quiz.current + 1}/{count}
        <span className="tabular-nums text-on-surface-variant">· {quiz.result ? `Đúng ${done}` : `Đã làm ${done}`}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button aria-label="Đóng danh sách câu" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" tabIndex={-1} />
          <div className="absolute left-0 top-8 z-20 w-[min(32rem,100%)] space-y-3 rounded-2xl border border-outline-variant bg-surface p-3 shadow-lg">
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
