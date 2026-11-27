import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export type CommentStatus = "APPROVED" | "PENDING" | "REJECTED";

// Đích của bình luận: số dương = câu hỏi (ảnh trang đề), số âm = tệp đính kèm (-id của tệp)
export const attachmentTarget = (attachmentId: number) => -attachmentId;
// 0 = bình luận chung của cả đề (cuối trang xem trước / xem đề)
export const EXAM_TARGET = 0;

export type CommentOrder = "oldest" | "newest";

export interface ExamComment {
  id: string;
  questionNumber: number;
  body: string; // văn bản thuần, hiển thị nguyên dạng (không HTML, không link)
  status: CommentStatus;
  createdAt: string;
  // joinedAt, commentCount: máy chủ cũ chưa gửi
  author: { name: string; avatarUrl: string | null; isPro?: boolean; isAdmin?: boolean; joinedAt?: string; commentCount?: number };
  index?: number | null; // số thứ tự #n của bình luận gốc trong bình luận chung (máy chủ cũ chưa gửi)
  mine: boolean;
  likes?: number; // máy chủ cũ chưa gửi
  liked?: boolean;
  // Phản hồi (máy chủ cũ chưa gửi): parentId = bình luận gốc; replyTo = người được trả lời khi trả lời một phản hồi
  parentId?: string | null;
  replyTo?: { name: string } | null;
  replyCount?: number;
  dislikes?: number;
  reaction?: CommentReaction;
}

export type CommentReaction = "like" | "dislike" | null;

export interface ReactionState {
  likes: number;
  dislikes: number;
  reaction: CommentReaction;
}

// Cảm xúc hiện tại của mình với một bình luận (máy chủ cũ chỉ có liked)
export const reactionOf = (c: ExamComment): CommentReaction => c.reaction ?? (c.liked ? "like" : null);

export interface Votes {
  voters: number;
  counts: Record<string, number>;
  mine: string[];
}

export interface Reactions {
  likes: number;
  liked: boolean;
  votes: Votes;
}

export interface LikeState {
  likes: number;
  liked: boolean;
}

export const COMMENT_MAX_LENGTH = 1000;
export const COMMENT_PAGE_SIZE = 20;

const base = (examId: string) => `/exams/${examId}`;

export const commentApi = {
  list: (examId: string, question: number, page: number, order?: CommentOrder) => http.list<ExamComment>(`${base(examId)}/comments`, { question, page, limit: COMMENT_PAGE_SIZE, order }),
  create: (examId: string, questionNumber: number, body: string, replyToId?: string) =>
    http.post<ExamComment>(`${base(examId)}/comments`, { questionNumber, body, ...(replyToId && { replyToId }) }),
  // Phản hồi của một bình luận gốc: phẳng, cũ trước
  replies: (examId: string, commentId: string, page: number) => http.list<ExamComment>(`${base(examId)}/comments/${commentId}/replies`, { page, limit: COMMENT_PAGE_SIZE }),
  react: (examId: string, commentId: string, reaction: CommentReaction) => http.put<ReactionState>(`${base(examId)}/comments/${commentId}/reaction`, { reaction }),
  remove: (examId: string, commentId: string) => http.delete(`${base(examId)}/comments/${commentId}`),
  report: (examId: string, commentId: string) => http.post<{ reported: true }>(`${base(examId)}/comments/${commentId}/report`, {}),
  counts: (examId: string) => http.get<{ counts: Record<string, number> }>(`${base(examId)}/comment-counts`),
  reactions: (examId: string, question: number) => http.get<Reactions>(`${base(examId)}/questions/${question}/reactions`),
  vote: (examId: string, question: number, answers: string[]) => http.put<Votes>(`${base(examId)}/questions/${question}/vote`, { answers }),
  likeQuestion: (examId: string, question: number, liked: boolean) => http.put<LikeState>(`${base(examId)}/questions/${question}/like`, { liked }),
};

// ----- Admin
export type AdminCommentFilter = "PENDING" | "REPORTED" | "APPROVED" | "REJECTED" | "all";
export type FlagReason = "WORDS" | "LINK" | "CONTACT" | "REPEATED" | "SPAM" | "STRIKES" | "REPORTED";

export interface AdminExamComment {
  id: string;
  questionNumber: number;
  body: string;
  status: CommentStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  flagReason: FlagReason | null;
  reportCount: number;
  targetName?: string | null; // tên tệp khi bình luận thuộc tệp đính kèm (questionNumber âm)
  parentId?: string | null; // có = phản hồi của một bình luận
  targetKind?: "question" | "file" | "exam"; // máy chủ cũ chưa gửi: suy ra từ questionNumber
  exam: { id: string; title: string };
  author: { id: string; email: string; fullName: string } | null;
  imageUrl: string | null;
}

export const adminCommentApi = {
  list: (status: AdminCommentFilter, q: string, page: number) => http.list<AdminExamComment>("/admin/exam-comments", { status, q, page, limit: PAGE_SIZE }),
  summary: () => http.get<{ pending: number; reported: number }>("/admin/exam-comments/summary"),
  review: (id: string, status: "APPROVED" | "REJECTED", note?: string) => http.patch<AdminExamComment>(`/admin/exam-comments/${id}`, { status, ...(note && { note }) }),
  bulk: (ids: string[], status: "APPROVED" | "REJECTED") => http.post<{ updated: number }>("/admin/exam-comments/bulk", { ids, status }),
  remove: (id: string) => http.delete(`/admin/exam-comments/${id}`),
};
