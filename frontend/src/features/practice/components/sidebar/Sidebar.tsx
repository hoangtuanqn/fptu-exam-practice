import { useState } from "react";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import { nextUnanswered } from "@/features/practice/utils/unanswered";
import { Button } from "@/shared/ui/Button";
import { Kbd } from "@/shared/ui/Kbd";
import { AnswerOptions } from "@/features/practice/components/quiz/AnswerOptions";
import { Legend } from "./Legend";
import { NavButtons } from "./NavButtons";
import { QuestionGrid } from "./QuestionGrid";
import { useSeason } from "@/shared/season/SeasonContext";
import { XmasGift, XmasTree } from "@/shared/season/XmasArt";

// Nút nhỏ "Câu 5/40" (điện thoại: nằm ngang phía trên; máy tính: viên thuốc dọc ở mép trái, cách mép).
// Bấm vào thì bung ra bảng số câu lớn để nhảy tới câu bất kỳ, chọn xong tự đóng (bấm ra ngoài hoặc Esc cũng đóng).
const SEEN_KEY = "practice_question_list_seen";
const wasSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // không đọc được thì khỏi nhắc
  }
};

export function Sidebar({ quiz, onSubmit }: { quiz: Quiz; onSubmit?: () => void }) {
  const [open, setOpen] = useState(false);
  const { showDecor } = useSeason();
  const [seen, setSeen] = useState(wasSeen); // đã từng mở danh sách: thôi chấm tròn nhấp nháy gợi ý bấm vào
  const toggle = () => {
    setOpen((o) => !o);
    if (!seen) {
      setSeen(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* không lưu được thì thôi */
      }
    }
  };
  useKeydown((e) => open && e.key === "Escape" && setOpen(false));

  const question = quiz.questions[quiz.current];
  const count = Math.max(quiz.total, quiz.questions.length);
  const nextUnansweredAt = nextUnanswered(quiz.questions, quiz.answers, quiz.current);
  const done = quiz.result ? quiz.result.correct : Object.values(quiz.answers).filter((a) => a.length > 0).length;

  return (
    <nav aria-label="Câu hỏi" className="relative z-10 shrink-0 px-2 pt-2 lg:px-0 lg:pb-4 lg:pl-4 lg:pt-4">
      <button
        onClick={toggle}
        aria-expanded={open}
        title="Danh sách câu"
        className="md-state md-label-medium panel-qlist-toggle"
      >
        {!seen && (
          <span aria-hidden className="absolute -right-1 -top-1 flex h-3 w-3 lg:right-auto lg:left-[calc(100%-1.25rem)] lg:top-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
        )}
        <LayoutGrid size={16} />
        <span className="tabular-nums lg:text-center">
          Câu {quiz.current + 1}
          <span className="lg:block">/{count}</span>
        </span>
        <ChevronDown size={14} className={`lg:hidden ${open ? "rotate-180" : ""}`} />
        <ChevronRight size={14} className={`hidden lg:block ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Màn hình rộng: đáp án A–H xếp dọc ngay dưới nút danh sách câu, nút nhỏ để dành chỗ cho đề (màn nhỏ: đáp án ở thanh dưới).
          Trước / Tiếp nằm liền dưới đáp án để chọn xong bấm luôn. Đáp án quá dài thì cuộn, hai nút Trước / Tiếp luôn thấy. */}
      {question && (
        <div className="mt-2 hidden max-h-[calc(100dvh-12rem)] w-full flex-col items-center rounded-2xl border border-outline-variant bg-surface-container-lowest px-1.5 py-2 shadow-sm lg:flex">
          <div className="flex min-h-0 w-full flex-col items-center overflow-x-hidden overflow-y-auto">
            <AnswerOptions vertical question={question} selected={quiz.answers[question.number] ?? []} revealed={quiz.isRevealed(question)} onChoose={(opt) => quiz.choose(question, opt)} />
          </div>
          <NavButtons hasPrev={quiz.current > 0} hasNext={quiz.current < quiz.questions.length - 1} onPrev={quiz.prev} onNext={quiz.next} onSubmit={onSubmit} />
        </div>
      )}

      {/* Mùa Giáng sinh: cây thông + quà nhỏ, tĩnh, mờ. Nằm trong luồng NGAY DƯỚI khung đáp án (chỗ riêng, không phủ lên nút nào),
          và chỉ hiện khi cột đủ cao (index.css: .xmas-exam-corner, từ 1024px rộng và 820px cao) */}
      {showDecor && (
        <div aria-hidden className="xmas-exam-corner pointer-events-none mt-3 items-end justify-center gap-0.5 opacity-60">
          <XmasGift className="h-3.5 w-3.5" />
          <XmasTree className="h-7 w-auto" />
          <XmasGift tone="green" className="h-3 w-3" />
        </div>
      )}

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
              locked={quiz.trialLocked}
              onSelect={(i) => {
                quiz.goTo(i);
                setOpen(false);
              }}
            />
            {!quiz.submitted && nextUnansweredAt >= 0 && (
              <Button
                variant="tonal"
                size="sm"
                className="w-full"
                onClick={() => {
                  quiz.goTo(nextUnansweredAt);
                  setOpen(false);
                }}
              >
                Tới câu chưa làm tiếp theo
                <span className="hidden lg:inline">
                  <Kbd>N</Kbd>
                </span>
              </Button>
            )}
            <Legend mode={quiz.mode} submitted={quiz.submitted} />
          </div>
        </>
      )}
    </nav>
  );
}
