import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

// Một câu trong "Câu đã lưu"; ảnh, đáp án và chủ đề luôn là bản mới nhất của đề
export interface SavedQuestion {
  id: number;
  examId: number;
  examTitle: string;
  threadId: string;
  subjectCode: string | null;
  number: number;
  imageUrl: string | null;
  correct?: string[]; // rỗng khi đề chưa có đáp án thật
  topic?: string | null;
  savedAt: string;
}

export const savedApi = {
  save: (examId: number, questionNumber: number) => http.post<{ saved: boolean }>("/saved-questions", { examId, questionNumber }),
  remove: (examId: number, number: number) => http.delete(`/saved-questions/${examId}/${number}`),
  ofExam: (examId: number) => http.get<number[]>(`/saved-questions/exam/${examId}`),
  list: (page = 1, subject?: string, limit = PAGE_SIZE) => http.list<SavedQuestion>("/saved-questions", { page, limit, subject: subject || undefined }),
};
