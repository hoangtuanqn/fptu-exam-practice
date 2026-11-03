import { http } from "@/shared/api/client";
import type { CrawlJob, ExamAnswersPayload, ImportedExam, SubmitResult } from "./types";

export const examImportApi = {
  submit: (url: string) => http.post<SubmitResult>("/crawl-jobs", { url }),
  price: () => http.get<{ price: number }>("/crawl-jobs/price"),
  job: (id: number) => http.get<CrawlJob>(`/crawl-jobs/${id}`),
  exam: (id: number) => http.get<ImportedExam>(`/exams/${id}`),
  // Hỏi lại trong lúc AI phân tích đáp án (nhẹ hơn tải cả đề)
  answers: (id: number) =>
    http.get<Omit<ExamAnswersPayload, "examId">>(`/exams/${id}/answers`),
  // Đề AI giải lỗi: nhờ AI giải lại (có thời gian chờ giữa hai lần)
  retrySolve: (id: number) => http.post<{ result: string }>(`/exams/${id}/retry-solve`),
  examByThread: (threadId: string) => http.get<ImportedExam>(`/exams/thread/${encodeURIComponent(threadId)}`),
};
