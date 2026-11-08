import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export interface ReviewSummary {
  due: number; // số câu đến hạn ôn hôm nay
  total: number; // số câu đang trong sổ
  mastered: number; // số câu đã nhớ (tốt nghiệp)
  limit: number | null; // giới hạn của gói thường; null = không giới hạn (Pro)
  nextDueAt: string | null; // lần ôn kế tiếp (khi hôm nay đã ôn hết)
}

// Một câu để ôn: ảnh + đáp án hiện tại
export interface ReviewQuestion {
  id: number;
  examId: number;
  examTitle: string;
  threadId: string;
  number: number;
  imageUrl: string;
  correct: string[];
  box: number;
  wrongCount: number;
  doubtful: boolean;
}

export interface ReviewRow {
  id: number;
  examId: number;
  examTitle: string;
  threadId: string;
  number: number;
  imageUrl: string | null;
  box: number;
  wrongCount: number;
  doubtful: boolean;
  mastered: boolean;
  nextReviewAt: string;
  due: boolean;
}

export interface ReviewAnswerResult {
  correct: boolean;
  correctAnswers: string[];
  box: number;
  mastered: boolean;
  nextReviewAt: string;
}

export interface StudyStats {
  streak: number; // số ngày học liên tiếp
  studiedToday: boolean;
  todayReviews: number; // số câu đã ôn hôm nay
  minReviews: number; // ôn từng này câu thì hôm nay tính là có học
  week: boolean[]; // thứ Hai .. Chủ nhật: ngày nào đã học
  todayIndex: number; // chỉ số của hôm nay trong `week`
  weekDone: number;
  goal: number; // mục tiêu số ngày học mỗi tuần
  goalMet: boolean;
}

export const reviewApi = {
  summary: () => http.get<ReviewSummary>("/review/summary"),
  queue: (all = false) => http.get<ReviewQuestion[]>("/review/queue", { all: all ? "1" : "0" }),
  list: (page = 1, status: "active" | "mastered" = "active", limit = PAGE_SIZE) => http.list<ReviewRow>("/review", { page, limit, status }),
  answer: (id: number, chosen: string[]) => http.post<ReviewAnswerResult>(`/review/${id}/answer`, { chosen }),
  remove: (id: number) => http.delete(`/review/${id}`),
};

export const studyApi = {
  stats: () => http.get<StudyStats>("/study/stats"),
  setGoal: (days: number) => http.put<StudyStats>("/study/goal", { days }),
};

// Hộp 1..5 -> nhãn dễ hiểu cho người dùng
export const BOX_LABEL = ["Mới sai", "Đang nhớ", "Khá chắc", "Gần thuộc", "Sắp thuộc"];
export const boxLabel = (box: number) => BOX_LABEL[Math.min(Math.max(box, 1), BOX_LABEL.length) - 1]!;

// "mai", "3 ngày nữa"... từ một mốc thời gian
export function dueText(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Đến hạn ôn";
  const days = Math.ceil(diff / 86_400_000);
  if (days <= 1) return "Ôn lại ngày mai";
  return `Ôn lại sau ${days} ngày`;
}
