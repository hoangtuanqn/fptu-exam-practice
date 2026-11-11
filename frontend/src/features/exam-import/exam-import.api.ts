import { http } from "@/shared/api/client";
import type { CrawlJob, ExamAnswersPayload, ImportedExam, SubmitResult } from "./types";

// reason/title: vì sao miễn phí ("owned" = đã có trong kho của bạn, kèm tên đề; "in-progress" = đang lấy dở)
export interface QuoteResult {
  price: number;
  fee: number;
  free: boolean;
  reason?: "owned" | "in-progress" | "pro" | null;
  title?: string | null;
}

export const examImportApi = {
  submit: (url: string, subject?: string) => http.post<SubmitResult>("/crawl-jobs", { url, ...(subject && { subject }) }),
  price: () => http.get<{ price: number; guestLimit?: number; guestRemaining?: number }>("/crawl-jobs/price"),
  // Phí thực tế của lần lấy này (0 nếu người dùng đã lấy đề này trước đó)
  quote: (url: string, subject?: string) => http.get<QuoteResult>("/crawl-jobs/quote", { url, ...(subject && { subject }) }),
  job: (id: number) => http.get<CrawlJob>(`/crawl-jobs/${id}`),
  exam: (id: number) => http.get<ImportedExam>(`/exams/${id}`),
  // Hỏi lại trong lúc AI phân tích đáp án (nhẹ hơn tải cả đề)
  answers: (id: number) =>
    http.get<Omit<ExamAnswersPayload, "examId">>(`/exams/${id}/answers`),
  // Đề AI giải lỗi: nhờ AI giải lại (có thời gian chờ giữa hai lần)
  retrySolve: (id: number) => http.post<{ result: string }>(`/exams/${id}/retry-solve`),
  examByThread: (threadId: string) => http.get<ImportedExam>(`/exams/thread/${encodeURIComponent(threadId)}`),
};
