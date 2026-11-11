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
}

export const examLibraryApi = {
  list: (page = 1, limit = PAGE_SIZE, subject?: string) => http.list<LibraryExam>("/exams", { page, limit, ...(subject && { subject }) }),
  // Sau khi đăng ký/đăng nhập: đề khách đã lấy trên trình duyệt này chuyển về tài khoản
  claim: () => http.post<{ claimed: number; jobs: number }>("/exams/claim"),
};
