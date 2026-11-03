export const MAX_SCORE = 10;

export type QuestionOutcome = "correct" | "wrong" | "skipped" | "ungraded";

export interface GradedQuestion {
  number: number;
  chosen: string[]; // đáp án người dùng chọn
  correct: string[]; // đáp án đúng tại lúc chấm
  outcome: QuestionOutcome;
}

export interface GradeSummary {
  totalGraded: number; // số câu chấm được (có đáp án)
  correct: number;
  wrong: number;
  skipped: number;
  score: number; // thang 10, làm tròn 2 chữ số
  items: GradedQuestion[];
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Chấm bài ở server (không tin điểm từ client). Cùng công thức với frontend:
 * điểm mỗi câu = 10 / số câu chấm được; câu đúng khi tập đáp án chọn trùng tập đáp án đúng.
 */
export function gradeAttempt(
  questions: { number: number; answer: string }[],
  chosenByNumber: Record<string, string[] | undefined>,
): GradeSummary {
  const items: GradedQuestion[] = questions.map((q) => {
    const correct = q.answer.split(/\s+/).filter(Boolean);
    const chosen = [...new Set(chosenByNumber[String(q.number)] ?? [])].sort();
    const outcome: QuestionOutcome =
      correct.length === 0 ? "ungraded" : chosen.length === 0 ? "skipped" : sameSet(chosen, correct) ? "correct" : "wrong";
    return { number: q.number, chosen, correct, outcome };
  });

  const totalGraded = items.filter((i) => i.outcome !== "ungraded").length;
  const correct = items.filter((i) => i.outcome === "correct").length;
  const skipped = items.filter((i) => i.outcome === "skipped").length;
  const score = totalGraded > 0 ? Math.round((correct / totalGraded) * MAX_SCORE * 100) / 100 : 0;

  return { totalGraded, correct, skipped, wrong: totalGraded - correct - skipped, score, items };
}
