import type { Mode, Question, UserAnswers } from "@/features/practice/types.ts";
import { MAX_SCORE } from "@/features/practice/config/scoring";
import { formatScore } from "@/features/practice/utils/format";
import { practiceStats, type GradeResult } from "@/features/practice/utils/grade";
import { LinearProgress } from "@/shared/ui/Feedback";

interface Props {
  questions: Question[];
  answers: UserAnswers;
  checked: Record<number, boolean>;
  mode: Mode;
  result: GradeResult | null; // có khi đã nộp bài
  total?: number; // tổng số câu của đề (lớn hơn số câu đã có khi đề đang được lấy về)
}

// Đầu sidebar: điểm (sau khi nộp) hoặc chỉ báo tiến trình tuyến tính (đang làm)
export function ProgressSummary({ questions, answers, checked, mode, result, total = 0 }: Props) {
  const count = Math.max(total, questions.length);
  if (result) {
    return (
      <div className="flex items-baseline justify-between gap-2 border-b border-outline-variant px-4 py-3">
        <div className="md-headline-small text-on-surface">
          {formatScore(result.score)}
          <span className="md-body-medium text-on-surface-variant"> / {MAX_SCORE}</span>
        </div>
        <div className="md-body-medium text-on-surface-variant">
          {result.correct}/{result.total} câu đúng
        </div>
      </div>
    );
  }

  const answered = Object.values(answers).filter((a) => a.length > 0).length;
  const { right, wrong } = practiceStats(questions, answers, checked);

  return (
    <div className="border-b border-outline-variant px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="md-title-small text-on-surface">
          {answered}
          <span className="md-body-medium font-normal text-on-surface-variant"> / {count} câu</span>
        </span>
        {mode === "practice" && (
          <span className="md-label-medium">
            <span className="text-success">Đúng {right}</span>
            <span className="text-outline"> · </span>
            <span className="text-error">Sai {wrong}</span>
          </span>
        )}
      </div>
      <div className="mt-2">
        <LinearProgress value={answered / Math.max(1, count)} label="Số câu đã làm" />
      </div>
    </div>
  );
}
