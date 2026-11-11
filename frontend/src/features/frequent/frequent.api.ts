import { http } from "@/shared/api/client";

export interface FrequentItem {
  count: number; // số đề có câu này
  examId: number;
  threadId: string;
  examTitle: string;
  number: number;
  imageUrl: string;
  answer: string[];
  topic: string | null;
  conflict: boolean; // các đề ghi đáp án khác nhau
}

export interface FrequentResult {
  subject: string;
  totalExams: number;
  repeated: number; // tổng số câu lặp tìm được
  pending: number; // số câu chưa phân tích ảnh (kết quả đầy đủ dần)
  locked: boolean;
  hidden: number; // số câu bị khóa (gói thường)
  items: FrequentItem[];
}

export type StatsConfidence = "low" | "medium" | "high";

// Thống kê theo chương của một môn (máy chủ tính sẵn, có thể chậm hơn đề mới một chút).
export interface ChapterStatItem {
  chapter: string;
  questionCount: number;
  examsWithChapter: number; // số đề có ít nhất một câu của chương
  totalExams: number;
  avgQuestionsPerExam: number;
  recencyScore: number; // 0..1, chỉ để máy chủ xếp hạng, không hiện ra giao diện
  confidence: StatsConfidence; // theo số đề đã dùng để tính
  lastSeenAt: string | null;
}

export interface ChapterStatsResult {
  subjectId: number;
  subject: string;
  totalExams: number;
  computedAt: string | null;
  items: ChapterStatItem[];
}

export const frequentApi = {
  forSubject: (code: string) => http.get<FrequentResult>(`/subjects/${encodeURIComponent(code)}/frequent`),
  chapterStats: (subjectId: number) => http.get<ChapterStatsResult>(`/subjects/${subjectId}/chapter-stats`),
};
