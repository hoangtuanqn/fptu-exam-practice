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
  exam: { id: number; title: string; threadId: string; totalQuestions: number };
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

// Số lần làm và điểm cao nhất của một đề
export interface ExamAttemptStats {
  attempts: number;
  bestScore: number | null;
}

export interface AttemptPayload {
  mode: AttemptMode;
  durationSec: number;
  answers: Record<number, string[]>;
  flagged?: number[]; // các câu đã đánh dấu phân vân (vào Sổ câu sai dù làm đúng)
}

// Kết quả lưu bài: kèm số câu mới vào Sổ câu sai và số câu không vào được vì sổ đã đầy (gói thường)
export interface AttemptTopic {
  topic: string;
  correct: number;
  total: number;
}
export interface SavedAttempt extends AttemptSummary {
  review?: { added: number; capped: number };
  topics?: AttemptTopic[]; // kết quả theo chủ đề của bài vừa nộp (gói thường chỉ có chủ đề yếu nhất)
  topicsHidden?: number; // số chủ đề còn lại chỉ Pro xem được
}

// Trạng thái phần chủ đề trong bảng điểm: null = không áp dụng (khách, đề mở từ thư mục), "loading" = đang lưu bài
export type TopicSummary = { topics: AttemptTopic[]; hidden: number } | "loading" | null;
