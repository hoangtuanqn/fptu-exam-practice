import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export type SessionMode = "PRACTICE" | "EXAM";

// Trạng thái làm bài gửi lên server (khoá là số câu)
export interface SessionState {
  answers: Record<string, string[]>;
  checked: Record<string, boolean>;
  flagged: Record<string, boolean>;
  current: number;
  elapsedSec: number;
}

export interface PracticeSession extends SessionState {
  id: number;
  examId: number;
  mode: SessionMode;
  status: "IN_PROGRESS" | "SUBMITTED";
  answered: number; // số câu đã chọn đáp án
  createdAt: string;
  updatedAt: string;
  exam: { id: number; title: string; threadId: string; totalQuestions: number };
}

export const sessionApi = {
  // Mỗi lần bấm làm bài là một lượt mới
  create: (examId: number, mode: SessionMode) => http.post<PracticeSession>(`/exams/${examId}/sessions`, { mode }),
  get: (id: number) => http.get<PracticeSession>(`/sessions/${id}`),
  save: (id: number, state: SessionState, submitted = false, keepalive = false) => http.put<{ id: number }>(`/sessions/${id}`, { ...state, ...(submitted && { submitted }) }, keepalive),
  remove: (id: number) => http.delete(`/sessions/${id}`),
  // Các lượt làm dở, mới cập nhật lên đầu
  listInProgress: (page = 1, limit = PAGE_SIZE) => http.list<PracticeSession>("/sessions", { page, limit }),
};

// Đường dẫn mở lại đúng lượt làm
export const sessionPath = (s: Pick<PracticeSession, "id" | "mode" | "exam">) => `/exam/${s.exam.threadId}?mode=${s.mode === "EXAM" ? "exam" : "practice"}&session=${s.id}`;
