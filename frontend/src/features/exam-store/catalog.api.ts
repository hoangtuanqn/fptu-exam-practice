import { http } from "@/shared/api/client";
import type { PageMeta } from "@/shared/types/api";

export interface CatalogSubject {
  code: string;
  name: string | null;
  total: number; // tổng số đề FE đã biết (FuOverflow + hệ thống)
  ready: number; // số đề hệ thống đã có sẵn ảnh và đáp án
}

// owned = đã trong kho của bạn, ready = hệ thống đã có (mở ngay), fetch = chưa lấy (lấy từ FuOverflow, có thể mất phí)
export type CatalogStatus = "owned" | "ready" | "fetch";

export interface CatalogItem {
  threadId: string;
  title: string;
  postedAt: string | null;
  replies: number;
  term: string | null; // kỳ học, ví dụ SU26
  status: CatalogStatus;
  questions: number | null;
}

export interface CatalogPage {
  items: CatalogItem[];
  meta: PageMeta;
  terms: { term: string; count: number }[];
  total: number; // tổng số đề của môn (trước khi lọc)
}

export const catalogApi = {
  subjects: () => http.get<CatalogSubject[]>("/catalog/subjects"),
  mySubjects: () => http.get<string[]>("/catalog/my-subjects"),
  exams: (subject: string, opts: { q?: string; term?: string; page?: number; limit?: number }) =>
    http.get<CatalogPage>("/catalog/exams", { subject, ...(opts.q && { q: opts.q }), ...(opts.term && { term: opts.term }), page: opts.page ?? 1, ...(opts.limit && { limit: opts.limit }) }),
};
