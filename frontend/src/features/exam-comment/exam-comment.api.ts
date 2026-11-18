import { http } from "@/shared/api/client";

export type CommentStatus = "PENDING" | "APPROVED" | "REJECTED";

// Bình luận của một câu trong đề; mine = của người đang xem (được xoá, thấy cả bài chờ duyệt/bị từ chối)
export interface ExamComment {
  id: string; // UUID; bình luận vừa gửi mà máy chủ không trả về thì là "local-..."
  questionNumber: number;
  body: string;
  status: CommentStatus;
  createdAt: string;
  author: { name: string; avatarUrl: string | null };
  mine: boolean;
}

export const COMMENT_MAX = 1000;
const LIMIT = 20;

export const examCommentApi = {
  list: (examId: string, question: number, page = 1) => http.list<ExamComment>(`/exams/${examId}/comments`, { question, page, limit: LIMIT }),
  // Số bình luận đã duyệt theo số câu ({ "3": 2 })
  counts: (examId: string) => http.get<{ counts?: Record<string, number> }>(`/exams/${examId}/comment-counts`),
  create: (examId: string, questionNumber: number, body: string) => http.post<ExamComment | undefined>(`/exams/${examId}/comments`, { questionNumber, body }),
  remove: (examId: string, commentId: string) => http.delete(`/exams/${examId}/comments/${commentId}`),
};
