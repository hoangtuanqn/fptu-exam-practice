import type { Mode, Question, UserAnswers } from "@/features/practice/types.ts";
import { MAX_SCORE } from "@/features/practice/config/scoring";
import { formatScore } from "@/features/practice/utils/format";
import { practiceStats, type GradeResult } from "@/features/practice/utils/grade";

interface Props {
  questions: Question[];
  answers: UserAnswers;
  checked: Record<number, boolean>;
  mode: Mode;
  result: GradeResult | null; // có khi đã nộp bài
}

// Đầu sidebar: điểm (sau khi nộp) hoặc thanh tiến độ (đang làm)
export function ProgressSummary({ questions, answers, checked, mode, result }: Props) {
  if (result) {
    return (
      <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="font-serif text-2xl font-semibold text-slate-900">
          {formatScore(result.score)}
          <span className="font-sans text-sm font-normal text-slate-400"> / {MAX_SCORE}</span>
        </div>
        <div className="text-sm text-slate-500">
          {result.correct}/{result.total} câu đúng
        </div>
      </div>
    );
  }

  const answered = Object.values(answers).filter((a) => a.length > 0).length;
  const { right, wrong } = practiceStats(questions, answers, checked);

  return (
    <div className="border-b border-slate-200 px-4 py-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-900">
          {answered}
          <span className="font-normal text-slate-400"> / {questions.length} câu</span>
        </span>
        {mode === "practice" && (
          <span className="text-xs">
            <span className="text-emerald-700">Đúng {right}</span>
            <span className="text-slate-300"> · </span>
            <span className="text-rose-700">Sai {wrong}</span>
          </span>
        )}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-900 transition-all"
          style={{ width: `${(answered / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
