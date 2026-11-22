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

// Lượt quét danh mục FuOverflow của "Load dữ liệu mới": chỉ tìm tên đề mới, không tải đề. null khi chưa quét lần nào.
export interface FuoSourceScan {
  status: "RUNNING" | "NEEDS_AUTH" | "FAILED" | "DONE"; // DONE: backend cũ không trả

  subjectsTotal: number;
  subjectsDone: number;
  subjectsFailed: number;
  currentSubject: string | null;
  threadsNew: number;
  threadsUpdated: number;
  lastError: string | null;
  // Các trường dưới đây backend cũ chưa có
  finishedAt?: string | null;
  newBySubject?: { code: string; threadsNew: number }[]; // môn có đề mới, nhiều nhất trước (có thể bị cắt, xem subjectsWithNew)
  subjectsWithNew?: number;
  coolingDownUntil?: string | null; // FuOverflow đang hạn chế truy cập: tạm nghỉ tới lúc này rồi tự chạy tiếp
}

export interface FuoSourcesStatus {
  run: FuoSourceRun | null;
  counts: FuoSourceCounts;
  scan?: FuoSourceScan | null; // backend cũ chưa có
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
  // Lấy nền mọi đề "Chưa có đề" (theo bộ lọc nếu có). started=false, queued>0: đã thêm vào lượt đang chạy
  fetchMissing: (filters: { kind?: string; subject?: string; q?: string }) =>
    http.post<FuoSourcesStatus & { started: boolean; queued: number }>("/admin/fuo-sources/fetch-missing", filters),
};
