import { http } from "@/shared/api/client";

export interface LibraryExam {
  id: number;
  title: string;
  threadId: string;
  totalQuestions: number;
  addedAt: string;
  attempts: number; // số lần đã làm
  bestScore: number | null;
}

export const examLibraryApi = {
  list: (page = 1, limit = 20) => http.list<LibraryExam>("/exams", { page, limit }),
};
