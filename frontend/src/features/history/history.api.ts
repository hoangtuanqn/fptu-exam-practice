import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";
import type { AttemptDetail, AttemptPayload, AttemptSummary, ExamAttemptStats, SavedAttempt } from "./types";

export const historyApi = {
  save: (examId: string, body: AttemptPayload) => http.post<SavedAttempt>(`/exams/${examId}/attempts`, body),
  list: (page = 1, limit = PAGE_SIZE, examId?: string) => http.list<AttemptSummary>("/attempts", { page, limit, examId }),
  summary: (examId: string) => http.get<ExamAttemptStats>("/attempts/summary", { examId }),
  get: (id: string) => http.get<AttemptDetail>(`/attempts/${id}`),
};
