import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";
import type { MyAnswerReport } from "@/shared/types/api";

export interface ReportForm {
  examId: number;
  questionNumber: number;
  proposedAnswer: string; // các chữ cái cách nhau dấu cách, ví dụ "A C"
  reason: string;
}

export const answerReportApi = {
  create: (body: ReportForm) => http.post<{ reward: number }>("/answer-reports", body),
  mine: (page = 1) => http.list<MyAnswerReport>("/answer-reports/mine", { page, limit: PAGE_SIZE }),
};
