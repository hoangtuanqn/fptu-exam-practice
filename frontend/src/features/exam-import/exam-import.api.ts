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

// Đề cần lấy: link FuOverflow, hoặc mã đề đã có sẵn trong hệ thống (đề tải tay không có link FuOverflow)
export type ImportTarget = { url: string } | { examId: string };
const targetOf = (t: string | ImportTarget): ImportTarget => (typeof t === "string" ? { url: t } : t);

export const examImportApi = {
  submit: (target: string | ImportTarget, subject?: string, captchaToken?: string) =>
    http.post<SubmitResult>("/crawl-jobs", { ...targetOf(target), ...(subject && { subject }), ...(captchaToken && { captchaToken }) }),
  price: () => http.get<{ price: number; guestLimit?: number; guestRemaining?: number }>("/crawl-jobs/price"),
  // Phí thực tế của lần lấy này (0 nếu người dùng đã lấy đề này trước đó)
  quote: (target: string | ImportTarget, subject?: string) => http.get<QuoteResult>("/crawl-jobs/quote", { ...targetOf(target), ...(subject && { subject }) }),
  job: (id: number) => http.get<CrawlJob>(`/crawl-jobs/${id}`),
  exam: (id: string) => http.get<ImportedExam>(`/exams/${id}`),
  // Hỏi lại trong lúc AI phân tích đáp án (nhẹ hơn tải cả đề)
  answers: (id: string) =>
    http.get<Omit<ExamAnswersPayload, "examId">>(`/exams/${id}/answers`),
  // Đề AI giải lỗi: nhờ AI giải lại (có thời gian chờ giữa hai lần)
  retrySolve: (id: string) => http.post<{ result: string }>(`/exams/${id}/retry-solve`),
};
