import { useEffect, useRef, type ReactNode } from "react";
import { Gem, ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { timeAgo } from "@/shared/ui/NotificationBell";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { reactionOf, type ExamComment } from "./exam-comments.api";

const ACTION = "md-state inline-flex min-h-10 items-center gap-1 rounded-full px-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary";

export interface CommentItemProps {
  c: ExamComment;
  reported: boolean;
  highlight?: boolean; // mở từ thông báo: cuộn tới và làm nổi bật
  onReact: (kind: "like" | "dislike") => void;
  onReply: () => void;
  onReport: () => void;
  onDelete: () => void;
  children?: ReactNode; // phản hồi của bình luận gốc
}

// Một bình luận hoặc phản hồi: nội dung là văn bản thuần (giữ xuống dòng, không HTML, không biến link thành liên kết)
export function CommentItem({ c, reported, highlight, onReact, onReply, onReport, onDelete, children }: CommentItemProps) {
  const approved = c.status === "APPROVED";
  const reaction = reactionOf(c);
  const likes = c.likes ?? 0;
  const dislikes = c.dislikes ?? 0;
  const bubble = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight) bubble.current?.scrollIntoView({ block: "center" });
  }, [highlight]);

  return (
    <li id={`comment-${c.id}`} className="flex gap-2.5">
      <UserAvatar src={c.author.avatarUrl} alt="" className="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <div ref={bubble} className={`inline-block max-w-full rounded-m3-lg bg-surface-container-high px-3 py-2 ${highlight ? "ring-2 ring-primary" : ""}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="md-label-large break-words text-on-surface">{c.author.name}</span>
            {c.author.isPro && <Gem size={14} className="text-primary" aria-label="Pro" role="img" />}
            {c.author.isAdmin && <Badge tone="info">Quản trị</Badge>}
          </div>
          <p className="md-body-medium whitespace-pre-wrap break-words text-on-surface">
            {c.replyTo && <span className="mr-1 font-medium text-primary">Trả lời {c.replyTo.name}</span>}
            {c.body}
          </p>
        </div>
        <div className="md-body-small flex flex-wrap items-center gap-x-0.5 text-on-surface-variant">
          <time dateTime={c.createdAt} className="px-2">
            {timeAgo(c.createdAt)}
          </time>
          {approved && (
            <>
              <button type="button" onClick={() => onReact("like")} aria-pressed={reaction === "like"} aria-label={`Thích bình luận của ${c.author.name}, ${likes} lượt`} className={`${ACTION} ${reaction === "like" ? "text-primary" : ""}`}>
                <ThumbsUp size={14} className={reaction === "like" ? "fill-current" : ""} aria-hidden />
                {likes > 0 && likes}
              </button>
              <button type="button" onClick={() => onReact("dislike")} aria-pressed={reaction === "dislike"} aria-label={`Không thích bình luận của ${c.author.name}, ${dislikes} lượt`} className={`${ACTION} ${reaction === "dislike" ? "text-primary" : ""}`}>
                <ThumbsDown size={14} className={reaction === "dislike" ? "fill-current" : ""} aria-hidden />
                {dislikes > 0 && dislikes}
              </button>
              <button type="button" onClick={onReply} aria-label={`Trả lời ${c.author.name}`} className={ACTION}>
                Trả lời
              </button>
            </>
          )}
          {approved && !c.mine && (
            <button type="button" onClick={onReport} disabled={reported} aria-label={`Báo cáo bình luận của ${c.author.name}`} className={`${ACTION} disabled:opacity-60`}>
              {reported ? "Đã báo cáo" : "Báo cáo"}
            </button>
          )}
          {c.mine && (
            <button type="button" onClick={onDelete} aria-label="Xoá bình luận của bạn" className={ACTION}>
              Xoá
            </button>
          )}
          {c.mine && c.status === "PENDING" && <Badge tone="warning">Chờ duyệt</Badge>}
          {c.mine && c.status === "REJECTED" && <Badge tone="danger">Bị từ chối</Badge>}
        </div>
        {children}
      </div>
    </li>
  );
}
