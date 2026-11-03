import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";
import type { AttemptDetail, AttemptPayload, AttemptSummary } from "./types";

export const historyApi = {
  save: (examId: number, body: AttemptPayload) => http.post<AttemptSummary>(`/exams/${examId}/attempts`, body),
  list: (page = 1, limit = PAGE_SIZE) => http.list<AttemptSummary>("/attempts", { page, limit }),
  get: (id: number) => http.get<AttemptDetail>(`/attempts/${id}`),
};
