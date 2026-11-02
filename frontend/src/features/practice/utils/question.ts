import type { Question } from "@/features/practice/types.ts";

// Câu có từ 2 đáp án đúng trở lên -> chọn nhiều
export const isMultiple = (q: Question) => q.correct.length > 1;

// Câu có đáp án trong ans.txt (mới chấm được)
export const hasAnswer = (q: Question) => q.correct.length > 0;

// Đúng khi tập đáp án chọn == tập đáp án đúng
export function isCorrect(q: Question, selected: string[] = []): boolean {
  return q.correct.length === selected.length && q.correct.every((c) => selected.includes(c));
}
