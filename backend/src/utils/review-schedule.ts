import { DAY_MS } from "./time";
import { REVIEW_INTERVAL_DAYS, REVIEW_MAX_BOX } from "../constants/review";

export interface Schedule {
  box: number;
  mastered: boolean;
  nextReviewAt: Date;
}

// Hộp 1..5 -> số ngày chờ. Hộp ngoài khoảng được kẹp lại cho an toàn.
export const intervalDaysOf = (box: number) => REVIEW_INTERVAL_DAYS[Math.min(Math.max(box, 1), REVIEW_MAX_BOX) - 1]!;

// Làm sai (hoặc bỏ qua): về hộp 1, mai ôn lại
export const afterWrong = (now = new Date()): Schedule => ({ box: 1, mastered: false, nextReviewAt: new Date(now.getTime() + intervalDaysOf(1) * DAY_MS) });

// Làm đúng khi đến hạn: lên hộp kế; đang ở hộp cuối thì tốt nghiệp khỏi sổ
export function afterCorrect(box: number, now = new Date()): Schedule {
  if (box >= REVIEW_MAX_BOX) return { box: REVIEW_MAX_BOX, mastered: true, nextReviewAt: now };
  const next = box + 1;
  return { box: next, mastered: false, nextReviewAt: new Date(now.getTime() + intervalDaysOf(next) * DAY_MS) };
}

// Câu đúng nhưng đã đánh dấu phân vân: vào sổ ở hộp 2 (ôn lại sau 3 ngày)
export const doubtfulStart = (now = new Date()): Schedule => ({ box: 2, mastered: false, nextReviewAt: new Date(now.getTime() + intervalDaysOf(2) * DAY_MS) });

// Hai tập đáp án giống nhau (không phân biệt thứ tự)
export const sameAnswers = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
