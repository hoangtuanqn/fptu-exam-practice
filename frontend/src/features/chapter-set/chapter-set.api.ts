import { http } from "@/shared/api/client";

export interface SubjectItem {
  code: string;
  name: string;
}

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

export const chapterSetApi = {
  frequent: (code: string) => http.get<FrequentResult>(`/subjects/${encodeURIComponent(code)}/frequent`),
  subjects: () => http.get<SubjectItem[]>("/subjects"),
};
