import { Gem } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { timeAgo } from "@/shared/ui/NotificationBell";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import type { ExamComment } from "./exam-comments.api";

const ACTION = "md-state inline-flex min-h-10 items-center rounded-full px-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary";

interface Props {
  c: ExamComment;
  reported: boolean;
  onLike: () => void;
  onReport: () => void;
  onDelete: () => void;
}

// Một bình luận: nội dung là văn bản thuần (giữ xuống dòng, không HTML, không biến link thành liên kết)
export function CommentItem({ c, reported, onLike, onReport, onDelete }: Props) {
  const approved = c.status === "APPROVED";
  const likes = c.likes ?? 0;
  return (
    <li className="flex gap-2.5">
      <UserAvatar src={c.author.avatarUrl} alt="" className="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-m3-lg bg-surface-container-high px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="md-label-large break-words text-on-surface">{c.author.name}</span>
            {c.author.isPro && <Gem size={14} className="text-primary" aria-label="Pro" role="img" />}
            {c.author.isAdmin && <Badge tone="info">Quản trị</Badge>}
          </div>
          <p className="md-body-medium whitespace-pre-wrap break-words text-on-surface">{c.body}</p>
        </div>
        <div className="md-body-small flex flex-wrap items-center gap-x-1 text-on-surface-variant">
          <time dateTime={c.createdAt} className="px-2">
            {timeAgo(c.createdAt)}
          </time>
          {approved && (
            <button type="button" onClick={onLike} aria-pressed={!!c.liked} aria-label={`Thích bình luận của ${c.author.name}`} className={`${ACTION} ${c.liked ? "text-primary" : ""}`}>
              Thích{likes > 0 && ` · ${likes}`}
            </button>
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
      </div>
    </li>
  );
}
