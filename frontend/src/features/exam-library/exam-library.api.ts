import { http } from "@/shared/api/client";

export interface LibraryExam {
  id: number;
  title: string;
  threadId: string;
  totalQuestions: number;
  addedAt: string;
  attempts: number; // số lần đã làm
  bestScore: number | null;
  answerSource: "PENDING" | "DEFAULT" | "AI" | "MANUAL";
}

export const examLibraryApi = {
  list: (page = 1, limit = 20) => http.list<LibraryExam>("/exams", { page, limit }),
  // Sau khi đăng ký/đăng nhập: đề khách đã lấy trên trình duyệt này chuyển về tài khoản
  claim: () => http.post<{ claimed: number }>("/exams/claim"),
};
