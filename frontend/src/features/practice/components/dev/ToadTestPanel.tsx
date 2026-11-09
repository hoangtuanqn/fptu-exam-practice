// TẠM THỜI (chỉ để thử con cóc ở bảng điểm): xoá file này và 2 dòng "ToadTestPanel" trong QuizWorkspace.tsx sau khi test xong.
// Chỉ hiện khi địa chỉ có ?toadtest=1. Bấm một mức điểm, bảng này tự chọn đáp án để bài đạt đúng điểm đó, rồi bạn bấm "Nộp bài" như bình thường.
import { useState } from "react";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { hasAnswer, isMultiple } from "@/features/practice/utils/question";
import type { Question } from "@/features/practice/types";

const SCORES = [0, 2, 4, 6, 7, 9, 9.7, 10];
const LETTERS = "ABCDEFGH".split("");

const wrongOf = (q: Question) => LETTERS.find((l) => !q.correct.includes(l)) ?? "A";

export function ToadTestPanel({ quiz }: { quiz: Quiz }) {
  const [note, setNote] = useState("");
  if (new URLSearchParams(window.location.search).get("toadtest") !== "1" || quiz.submitted) return null;

  // Đưa đáp án đang chọn của một câu về đúng tập `want` bằng chính hàm chọn của bài làm (không đụng logic chấm)
  const setSelection = (q: Question, want: string[]) => {
    const have = quiz.answers[q.number] ?? [];
    if (isMultiple(q)) {
      for (const l of new Set([...have, ...want])) if (have.includes(l) !== want.includes(l)) quiz.choose(q, l);
    } else if (have[0] !== want[0]) quiz.choose(q, want[0]!);
  };

  const fill = (target: number) => {
    const gradable = quiz.questions.filter(hasAnswer);
    const total = gradable.length;
    if (total === 0) return setNote("Chưa có đáp án để chấm (AI chưa xong?)");
    const right = Math.round((target * total) / 10);
    gradable.forEach((q, i) => setSelection(q, i < right ? q.correct : [wrongOf(q)]));
    setNote(`Đã điền ${right}/${total} câu đúng = ${((right * 10) / total).toFixed(2)} điểm. Bấm "Nộp bài".`);
  };

  return (
    <div className="fixed bottom-3 left-3 z-50 max-w-[calc(100vw-24px)] rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 shadow-lg">
      <div className="mb-1.5 font-semibold">Thử cóc: điền đáp án theo điểm</div>
      <div className="flex flex-wrap gap-1.5">
        {SCORES.map((s) => (
          <button key={s} type="button" onClick={() => fill(s)} className="rounded-md border border-amber-400 bg-white px-2 py-1 font-medium hover:bg-amber-100">
            {s}
          </button>
        ))}
      </div>
      {note && <p className="mt-1.5 max-w-[260px] leading-snug">{note}</p>}
    </div>
  );
}
