import { http } from "@/shared/api/client";
import type { CrawlJob, ImportedExam, SubmitResult } from "./types";

export const examImportApi = {
  submit: (url: string) => http.post<SubmitResult>("/crawl-jobs", { url }),
  price: () => http.get<{ price: number }>("/crawl-jobs/price"),
  job: (id: number) => http.get<CrawlJob>(`/crawl-jobs/${id}`),
  exam: (id: number) => http.get<ImportedExam>(`/exams/${id}`),
};
