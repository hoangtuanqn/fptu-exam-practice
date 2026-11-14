import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export interface LibraryExam {
  id: number;
  title: string;
  threadId: string;
  totalQuestions: number;
  addedAt: string;
  attempts: number; // số lần đã làm
  bestScore: number | null;
  answerSource: "PENDING" | "FAILED" | "DEFAULT" | "AI" | "MANUAL";
  attachments?: number; // số tệp đính kèm (máy chủ cũ không trả về)
}

// "40 câu"; đề chỉ có tệp thì "2 tệp đính kèm"
export const sizeText = (e: LibraryExam) => (e.totalQuestions === 0 && (e.attachments ?? 0) > 0 ? `${e.attachments} tệp đính kèm` : `${e.totalQuestions} câu`);

export const examLibraryApi = {
  list: (page = 1, limit = PAGE_SIZE, subject?: string) => http.list<LibraryExam>("/exams", { page, limit, ...(subject && { subject }) }),
  // Sau khi đăng ký/đăng nhập: đề khách đã lấy trên trình duyệt này chuyển về tài khoản
  claim: () => http.post<{ claimed: number; jobs: number }>("/exams/claim"),
};
