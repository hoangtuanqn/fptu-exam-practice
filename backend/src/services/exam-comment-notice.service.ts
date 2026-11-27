import { EXAM_COMMENT_NOTICE_EXCERPT, EXAM_COMMENT_REACTION_NOTICE_KEYS_MAX, EXAM_COMMENT_REACTION_NOTICE_THROTTLE_MS } from "../constants/exam-comment";
import { USER_NOTICE_TITLE_MAX } from "../constants/user-notice";
import type { CommentReaction } from "../repositories/exam-comment.repository";
import { userNoticeService } from "./user-notice.service";

// Thông báo (chuông) cho người viết bình luận: có người thích / không thích / trả lời. Chỉ là phụ: lỗi chỉ ghi log, không làm hỏng request.

type Target = { examId: string; questionNumber: number; commentId: string };

export const commentLink = ({ examId, questionNumber, commentId }: Target) => `/exam/${examId}/preview?target=${questionNumber}&comment=${commentId}`;
const excerpt = (body: string) => (body.length > EXAM_COMMENT_NOTICE_EXCERPT ? `${body.slice(0, EXAM_COMMENT_NOTICE_EXCERPT)}…` : body);

function send(userId: string, data: { kind: string; title: string; body: string; link: string }) {
  // Tên hiển thị dài có thể vượt cột tiêu đề
  void userNoticeService.notify(userId, { ...data, title: data.title.slice(0, USER_NOTICE_TITLE_MAX), level: "info" }).catch((err: unknown) => console.error("[comment-notice]", data.kind, (err as Error).message));
}

// shortcut: chống báo trùng trong bộ nhớ (mất khi khởi động lại = báo thêm một lần); một tiến trình PM2 nên đủ
const lastReaction = new Map<string, number>();

export const commentNoticeService = {
  /** Vừa thêm hoặc đổi cảm xúc trên bình luận của người khác. Không thích thì không nói tên người bấm. */
  reaction(t: Target & { authorId: string; body: string }, actor: { id: string; name: string }, reaction: CommentReaction, now = Date.now()) {
    if (actor.id === t.authorId) return false;
    const key = `${t.commentId}:${reaction}`;
    const last = lastReaction.get(key);
    if (last !== undefined && now - last < EXAM_COMMENT_REACTION_NOTICE_THROTTLE_MS) return false;
    if (lastReaction.size >= EXAM_COMMENT_REACTION_NOTICE_KEYS_MAX) lastReaction.clear();
    lastReaction.set(key, now);
    send(t.authorId, {
      kind: reaction === "like" ? "comment.liked" : "comment.disliked",
      title: reaction === "like" ? `${actor.name} đã thích bình luận của bạn` : "Có người không thích bình luận của bạn",
      body: excerpt(t.body),
      link: commentLink(t),
    });
    return true;
  },

  /** Trả lời đã hiện công khai: báo cho người được trả lời và người viết bình luận gốc (mỗi người một lần, không báo cho chính mình). */
  reply(t: Target & { body: string }, author: { id: string; name: string }, recipients: (string | null | undefined)[]) {
    const to = [...new Set(recipients.filter((r): r is string => !!r && r !== author.id))];
    for (const userId of to) send(userId, { kind: "comment.replied", title: `${author.name} đã trả lời bình luận của bạn`, body: excerpt(t.body), link: commentLink(t) });
    return to;
  },
};
