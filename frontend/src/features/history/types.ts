export type AttemptMode = "PRACTICE" | "EXAM";
export type Outcome = "correct" | "wrong" | "skipped" | "ungraded";

export interface AttemptSummary {
  id: number;
  examId: number;
  mode: AttemptMode;
  score: number; // thang 10
  totalGraded: number;
  correct: number;
  wrong: number;
  skipped: number;
  durationSec: number;
  createdAt: string;
  exam: { id: number; title: string; totalQuestions: number };
}

// Ảnh chụp từng câu lúc chấm: đã chọn gì, đáp án đúng lúc đó là gì
export interface AttemptQuestion {
  number: number;
  chosen: string[];
  correct: string[];
  outcome: Outcome;
}

export interface AttemptDetail extends AttemptSummary {
  details: AttemptQuestion[];
}

export interface AttemptPayload {
  mode: AttemptMode;
  durationSec: number;
  answers: Record<number, string[]>;
}
