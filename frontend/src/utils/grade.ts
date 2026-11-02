import type { Question, UserAnswers } from "../types";
import { MAX_SCORE } from "../config/scoring";
import { hasAnswer, isCorrect } from "./question";

export type QuestionStatus = "unanswered" | "answered" | "correct" | "wrong" | "ungraded";

export interface GradeResult {
  total: number; // số câu được chấm (có đáp án trong ans.txt)
  correct: number;
  wrong: number; // đã làm nhưng sai
  skipped: number; // chưa làm
  pointPerQuestion: number; // điểm mỗi câu = 10 / total
  score: number; // điểm = số câu đúng * điểm mỗi câu
}

export function grade(questions: Question[], answers: UserAnswers): GradeResult {
  const gradable = questions.filter(hasAnswer);
  const total = gradable.length;
  const correct = gradable.filter((q) => isCorrect(q, answers[q.number])).length;
  const skipped = gradable.filter((q) => (answers[q.number] ?? []).length === 0).length;
  const pointPerQuestion = total > 0 ? MAX_SCORE / total : 0;

  return {
    total,
    correct,
    skipped,
    wrong: total - correct - skipped,
    pointPerQuestion,
    score: correct * pointPerQuestion,
  };
}

// Thống kê nhanh các câu đã hiện kết quả (chế độ luyện tập)
export function practiceStats(questions: Question[], answers: UserAnswers, checked: Record<number, boolean>) {
  const reviewed = questions.filter((q) => checked[q.number]);
  const right = reviewed.filter((q) => isCorrect(q, answers[q.number])).length;
  return { right, wrong: reviewed.length - right };
}

// revealed = câu đã hiện kết quả (đã nộp bài, hoặc đã xác nhận ở chế độ luyện tập)
export function getStatus(question: Question, selected: string[] = [], revealed: boolean): QuestionStatus {
  if (!revealed) return selected.length > 0 ? "answered" : "unanswered";
  if (!hasAnswer(question)) return "ungraded";
  return isCorrect(question, selected) ? "correct" : "wrong";
}
