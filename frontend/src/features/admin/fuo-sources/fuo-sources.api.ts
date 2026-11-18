import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

// Danh sách link đề FuOverflow của admin và lượt "Load dữ liệu mới" chạy nền trên toàn bộ danh sách
export type FuoSourceStatus = "NEW" | "QUEUED" | "RUNNING" | "DONE" | "FAILED";
export type FuoSourceResult = "IMPORTED" | "UPDATED" | "UNCHANGED" | "ORDER_CHANGED";

export interface FuoSource {
  id: string;
  url: string;
  threadId: string;
  status: FuoSourceStatus;
  result: FuoSourceResult | null;
  examId: string | null;
  addedQuestions?: number; // số câu vừa thêm vào đề đã có ở lần lấy gần nhất (backend cũ chưa có)
  lastError: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FuoSourceRun {
  id: string;
  status: "RUNNING" | "DONE" | "NEEDS_AUTH";
  total: number;
  done: number;
  failed: number;
  running: number;
  imported: number;
  updated: number;
  lastError: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export type FuoSourceCounts = Record<FuoSourceStatus | "total", number>;

export interface FuoSourcesStatus {
  run: FuoSourceRun | null;
  counts: FuoSourceCounts;
}

export interface FuoSourcesAddResult {
  accepted: number;
  added: number;
  existing: number;
  duplicates: { line: number; sameAs: number }[];
  rejected: { line: number; text: string; reason: string }[];
}

export const fuoSourcesApi = {
  add: (text: string) => http.post<FuoSourcesAddResult>("/admin/fuo-sources", { text }),
  list: (page: number, status: FuoSourceStatus | "") => http.list<FuoSource>("/admin/fuo-sources", { page, status, limit: PAGE_SIZE }),
  status: () => http.get<FuoSourcesStatus>("/admin/fuo-sources/status"),
  start: () => http.post<FuoSourcesStatus & { started: boolean }>("/admin/fuo-sources/runs"),
};
