import { ApiError, http, sendForm } from "@/shared/api/client";
import type { StatsConfidence } from "@/features/frequent/frequent.api";

export type MaterialStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export interface MaterialQuota {
  isPro: boolean;
  percentUsed: number; // 0-100
  resetsAt: string | null;
}

export interface MaterialItem {
  id: number | string;
  title: string;
  subjectCode: string | null;
  subjectName?: string | null;
  status: MaterialStatus;
  progress?: { done: number; total: number } | null;
  pages?: number | null;
  error?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface KeyPoint {
  text: string;
  pages?: number[];
}

export interface Figure {
  page: number;
  type?: string | null;
  summary: string;
  confidence?: "low" | "medium" | "high" | null;
}

export interface MaterialChapter {
  number: number;
  title: string;
  pageRange?: string | null;
  summary?: string | null;
  keyPoints?: KeyPoint[];
  figures?: Figure[];
  stats?: { examsWithChapter: number; totalExams: number; confidence: StatsConfidence } | null;
}

export interface MaterialDetail extends MaterialItem {
  chapters?: MaterialChapter[];
  unmatchedPages?: number;
}

export interface UploadResult {
  id: number | string;
  status: MaterialStatus;
  duplicate?: boolean;
}

export const resultPath = (id: number | string) => `/account/materials/${encodeURIComponent(String(id))}`;

export const isActive =(m: Pick<MaterialItem, "status">) => m.status === "QUEUED" || m.status === "RUNNING";

export const materialsApi = {
  quota: () => http.get<MaterialQuota>("/materials/quota"),
  list: () => http.get<{ items?: MaterialItem[] }>("/materials").then((d) => (Array.isArray(d?.items) ? d.items : [])),
  // Kết quả đã hết hạn hoặc bị xoá: trả null để trang báo nhẹ nhàng thay vì báo lỗi
  get: (id: string) =>
    http.get<MaterialDetail>(`/materials/${encodeURIComponent(id)}`).catch((err: unknown) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return null;
      throw err;
    }),
  upload: (file: File, subjectCode: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("subjectCode", subjectCode);
    return sendForm<UploadResult>("POST", "/materials", form);
  },
  remove: (id: number | string) => http.delete(`/materials/${encodeURIComponent(String(id))}`),
};
