import { http } from "@/shared/api/client";
import type { PageMeta } from "@/shared/types/api";
import type { ExamKind } from "@/features/exam/types";

export interface CatalogSubject {
  code: string;
  name: string | null;
  total: number; // tổng số đề của môn
  ready: number; // số đề hệ thống đã có sẵn ảnh và đáp án
  semester: number | null; // kỳ học 0-9, null = chưa phân loại
}

// owned = đã trong kho của bạn, ready = hệ thống đã có. "fetch" chỉ còn ở máy chủ cũ (mục chưa có đề, giao diện bỏ qua)
export type CatalogStatus = "owned" | "ready" | "fetch";

export interface CatalogItem {
  examId: string | null; // ID đề trong hệ thống; null = mục chưa có đề của máy chủ cũ, không hiện
  threadId: string;
  title: string;
  postedAt: string | null;
  replies: number;
  term: string | null; // kỳ học, ví dụ SU26
  status: CatalogStatus;
  questions: number | null;
  kind?: ExamKind;
  opened?: boolean; // đã mở đề (chọn chế độ hoặc xem trước), máy chủ cũ chưa trả
  attempts?: number; // số lần bạn đã nộp bài đề này; máy chủ cũ chưa trả
}

export interface CatalogPage {
  items: CatalogItem[];
  meta: PageMeta;
  terms: { term: string; count: number }[];
  total: number; // tổng số đề của môn (trước khi lọc)
  kinds?: Record<ExamKind, number>; // số đề theo loại của cả môn
  price: number; // phí mở một đề chưa có trong kho của bạn (credit)
  pePrice?: number; // đề PE có giá riêng; API cũ chưa có thì dùng price
  subject: { code: string; name: string | null; semester: number | null };
}

// Xem thử đề chưa mở khoá: vài câu đầu (ảnh, không đáp án), còn lại chỉ có số lượng
export interface ExamTrial {
  examId: string;
  title: string;
  kind: ExamKind;
  subjectCode: string | null;
  totalQuestions: number;
  questions: { number: number; imageUrl: string }[];
  locked: number;
}

export interface LibraryOverview {
  subjects: number;
  examsKnown: number; // tổng số đề của các môn
  examsReady: number; // đề đã có ảnh + đáp án, mở ngay
  bySemester: { semester: number | null; subjects: number; examsKnown: number; examsReady: number }[];
  byKind?: Record<ExamKind, number>; // số đề theo loại; máy chủ cũ chưa trả về
}

// Đề mới đăng gần đây trên danh mục (chỉ mô tả)
export interface LatestExam {
  threadId: string;
  subjectCode: string;
  title: string;
  postedAt: string;
  term: string | null;
  kind?: ExamKind;
}

export const catalogApi = {
  latest: () => http.get<LatestExam[]>("/catalog/latest"),
  overview: () => http.get<LibraryOverview>("/catalog/overview"),
  subjects: () => http.get<CatalogSubject[]>("/catalog/subjects"),
  trial: (examId: string) => http.get<ExamTrial>(`/catalog/exams/${examId}/trial`),
  mySubjects: () => http.get<string[]>("/catalog/my-subjects"),
  exams: (subject: string, opts: { q?: string; term?: string; kind?: string; page?: number; limit?: number }) =>
    http.get<CatalogPage>("/catalog/exams", { subject, ...(opts.q && { q: opts.q }), ...(opts.term && { term: opts.term }), ...(opts.kind && { kind: opts.kind }), page: opts.page ?? 1, ...(opts.limit && { limit: opts.limit }) }),
};
