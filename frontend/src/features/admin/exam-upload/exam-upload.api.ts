import { http, sendForm } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export type ExamKind = "FE" | "PE" | "QUIZ" | "OTHER";
export type ExamGap = "no_exam" | "no_images" | "no_answers"; // no_exam: chỉ còn ở máy chủ cũ, giao diện không lọc theo

export const KIND_LABEL: Record<ExamKind, string> = { FE: "FE", PE: "PE", QUIZ: "QUIZ", OTHER: "Khác" };

export interface ExamGapItem {
  threadId: string;
  examId: string | null;
  title: string;
  subjectCode: string | null;
  kind: ExamKind | null;
  postedAt: string | null;
  questions: number;
  answered: number;
  gap: ExamGap;
}

export interface ExamGapSummary {
  noExam: number;
  noImages: number;
  noAnswers: number;
}

export interface GapFilter {
  gap: ExamGap | "";
  kind: ExamKind | "";
  subject: string;
  q: string;
  page: number;
}

export interface UploadInput {
  images: File[];
  ansJson: string | null; // nguyên văn ans.json, máy chủ tự đọc theo tên ảnh
}

export interface CreateExamInput extends UploadInput {
  title: string;
  subjectCode: string;
  kind: ExamKind;
}

export type UploadJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

// Một lượt tải đề chạy nền (202 của ?async=1 và GET /admin/exam-upload/jobs). `result` chỉ có khi DONE, `error` khi FAILED
export interface UploadJob {
  uploadId?: string; // thiếu khi máy chủ cũ trả kết quả xử lý ngay
  kind: "create" | "update";
  title: string;
  status: UploadJobStatus;
  files: number;
  error: string | null;
  result: { id: string; questions?: number; answered?: number } | null; // lượt tải tệp đính kèm không có số câu
}

// Trường chữ đặt trước ảnh (máy chủ đọc được khi đang nhận ảnh). Gửi nguyên tệp (tên Qn.webp, không nén lại): máy chủ lấy số câu từ tên tệp
function uploadForm({ images, ansJson }: UploadInput, fields: Record<string, string | undefined> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
  if (ansJson) form.append("answers", ansJson);
  for (const f of images) form.append("images", f, f.name);
  return form;
}

export const examUploadApi = {
  gaps: (f: GapFilter) => http.list<ExamGapItem>("/admin/exam-gaps", { gap: f.gap, kind: f.kind, subject: f.subject, q: f.q, page: f.page, limit: PAGE_SIZE }),
  summary: () => http.get<ExamGapSummary>("/admin/exam-gaps/summary"),
  create: ({ title, subjectCode, kind, overwrite, ...rest }: CreateExamInput & { overwrite?: boolean }) => {
    const form = uploadForm(rest, { title: title.trim(), subjectCode, kind, overwrite: overwrite ? "1" : undefined });
    return sendForm<UploadJob>("POST", "/admin/exams/upload?async=1", form);
  },
  // Thư mục tài liệu (không phải đề trắc nghiệm): máy chủ xếp hàng, lưu nền như tải đề. overwrite: tên đề đã có thì thay tệp của đề đó
  createResource: ({ title, subjectCode, kind, files, overwrite }: Omit<CreateExamInput, keyof UploadInput> & { files: File[]; overwrite?: boolean }) => {
    const form = new FormData();
    form.append("title", title.trim());
    form.append("subjectCode", subjectCode);
    form.append("kind", kind);
    if (overwrite) form.append("overwrite", "1");
    for (const f of files) form.append("files", f, f.name);
    return sendForm<UploadJob>("POST", "/admin/exams/upload-resource?async=1", form);
  },
  addImages: (examId: string, input: UploadInput) => {
    return sendForm<UploadJob>("POST", `/admin/exams/${encodeURIComponent(examId)}/images?async=1`, uploadForm(input));
  },
  // Thêm tệp đính kèm cho đề (giữ tệp cũ), xử lý nền như addImages
  addAttachments: (examId: string, files: File[]) => {
    const form = new FormData();
    for (const f of files) form.append("files", f, f.name);
    return sendForm<UploadJob>("POST", `/admin/exams/${encodeURIComponent(examId)}/attachments?async=1`, form);
  },
  // Thay nội dung một tệp đính kèm. rename: lấy luôn tên tệp mới
  replaceAttachment: (examId: string, attachmentId: number, file: File, rename: boolean) => {
    const form = new FormData();
    if (rename) form.append("rename", "1");
    form.append("file", file, file.name);
    return sendForm<UploadJob>("POST", `/admin/exams/${encodeURIComponent(examId)}/attachments/${attachmentId}/replace?async=1`, form);
  },
  jobs: () => http.get<UploadJob[]>("/admin/exam-upload/jobs"),
  removeJob: (uploadId: string) => http.delete(`/admin/exam-upload/jobs/${encodeURIComponent(uploadId)}`),
  clearJobs: () => http.delete("/admin/exam-upload/jobs"),
};
