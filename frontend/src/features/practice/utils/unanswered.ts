import type { Question, UserAnswers } from "@/features/practice/types.ts";

// Vị trí câu chưa làm kế tiếp sau câu `from` (vòng lại từ đầu nếu hết); -1 nếu đã làm hết
export function nextUnanswered(questions: Question[], answers: UserAnswers, from: number): number {
  const n = questions.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!answers[questions[i]!.number]?.length) return i;
  }
  return -1;
}
