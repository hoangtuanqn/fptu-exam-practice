import { http } from "@/shared/api/client";

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
}
export interface Funnel {
  days: number;
  steps: FunnelStep[];
  crawl: { done: number; failed: number; running: number; topErrors: { message: string; count: number }[] };
  deposits: { paid: number; pending: number; expired: number };
  practice: { started: number; submitted: number; abandoned: number };
}

export interface ExamToReview {
  id: number;
  title: string;
  threadId: string;
  answerSource: string;
  attempts: number; // số lượt làm bài
  pending: number; // báo cáo đáp án chưa xử lý
  total: number; // tổng báo cáo
}

export interface QuestionQuality {
  number: number;
  imageUrl: string;
  answer: string;
  answered: number;
  wrong: number;
  wrongRate: number; // 0..1
  topPick: string | null; // phương án được chọn nhiều nhất
  topPickShare: number; // 0..1
  suspicious: boolean; // đa số chọn khác đáp án hiện tại
  enoughSample: boolean;
  reports: number;
  pendingReports: number;
}
export interface ExamQuality {
  exam: { id: number; title: string; threadId: string; answerSource: string };
  sampleUsers: number;
  minSample: number;
  questions: QuestionQuality[];
}

export interface PromptPerformance {
  days: number;
  prompts: { surface: string; shown: number; click: number; dismiss: number; clickRate: number | null }[];
}

export const insightsApi = {
  prompts: (days: number) => http.get<PromptPerformance>("/admin/insights/prompts", { days }),
  funnel: (days: number) => http.get<Funnel>("/admin/insights/funnel", { days }),
  exams: () => http.get<ExamToReview[]>("/admin/insights/exams"),
  examQuestions: (id: number) => http.get<ExamQuality>(`/admin/insights/exams/${id}/questions`),
};
