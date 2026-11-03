import { http } from "@/shared/api/client";
import type { AttemptDetail, AttemptPayload, AttemptSummary } from "./types";

export const historyApi = {
  save: (examId: number, body: AttemptPayload) => http.post<AttemptSummary>(`/exams/${examId}/attempts`, body),
  list: (page = 1, limit = 15) => http.list<AttemptSummary>("/attempts", { page, limit }),
  get: (id: number) => http.get<AttemptDetail>(`/attempts/${id}`),
};
