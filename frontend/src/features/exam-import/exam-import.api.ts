import { http } from "@/shared/api/client";
import type { CrawlJob, ImportedExam, SubmitResult } from "./types";

export const examImportApi = {
  submit: (url: string) => http.post<SubmitResult>("/crawl-jobs", { url }),
  price: () => http.get<{ price: number }>("/crawl-jobs/price"),
  job: (id: number) => http.get<CrawlJob>(`/crawl-jobs/${id}`),
  exam: (id: number) => http.get<ImportedExam>(`/exams/${id}`),
  // Hỏi lại trong lúc AI phân tích đáp án (nhẹ hơn tải cả đề)
  answers: (id: number) =>
    http.get<{ status: ImportedExam["answerStatus"]; answers: { number: number; correct: string[] }[] }>(`/exams/${id}/answers`),
  examByThread: (threadId: string) => http.get<ImportedExam>(`/exams/thread/${encodeURIComponent(threadId)}`),
};
