import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";
import type { AttemptDetail, AttemptPayload, AttemptSummary, ExamAttemptStats, SavedAttempt } from "./types";

export const historyApi = {
  save: (examId: number, body: AttemptPayload) => http.post<SavedAttempt>(`/exams/${examId}/attempts`, body),
  list: (page = 1, limit = PAGE_SIZE, examId?: number) => http.list<AttemptSummary>("/attempts", { page, limit, examId }),
  summary: (examId: number) => http.get<ExamAttemptStats>("/attempts/summary", { examId }),
  get: (id: number) => http.get<AttemptDetail>(`/attempts/${id}`),
};
