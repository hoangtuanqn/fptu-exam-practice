import { http } from "@/shared/api/client";
import type { ExamAnswersPayload, ImportedExam } from "./types";

// Phí mở một đề có sẵn trong hệ thống. reason: vì sao miễn phí ("owned" = đã có trong kho của bạn)
export interface QuoteResult {
  price: number;
  fee: number;
  free: boolean;
  reason?: "owned" | "in-progress" | "pro" | null;
  title?: string | null;
}

export const examApi = {
  // Thêm đề có sẵn vào kho của bạn (trừ phí nếu có); đề có sẵn nên máy chủ trả examId ngay
  unlock: (examId: string, subject?: string) => http.post<{ examId: string; title: string; free?: boolean }>("/crawl-jobs", { examId, ...(subject && { subject }) }),
  price: () => http.get<{ price: number }>("/crawl-jobs/price"),
  // Phí thực tế của lần mở này (0 nếu đã có trong kho hoặc đang dùng Pro)
  quote: (examId: string, subject?: string) => http.get<QuoteResult>("/crawl-jobs/quote", { examId, ...(subject && { subject }) }),
  exam: (id: string) => http.get<ImportedExam>(`/exams/${id}`),
  // Ghi nhận đã mở đề (trang xem trước) để Kho đề bỏ chấm chưa xem; lỗi thì bỏ qua
  markOpened: (id: string) => http.post(`/exams/${id}/opened`).catch(() => undefined),
  // Hỏi lại trong lúc AI phân tích đáp án (nhẹ hơn tải cả đề)
  answers: (id: string) => http.get<Omit<ExamAnswersPayload, "examId">>(`/exams/${id}/answers`),
  // Đề AI giải lỗi: nhờ AI giải lại (có thời gian chờ giữa hai lần)
  retrySolve: (id: string) => http.post<{ result: string }>(`/exams/${id}/retry-solve`),
};
