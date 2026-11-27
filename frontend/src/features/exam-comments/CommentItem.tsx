import { useEffect, useRef, useState, type ReactNode } from "react";
import { CornerDownRight, Flag, MoreHorizontal, Reply, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { IconButton } from "@/shared/ui/Button";
import { timeAgo } from "@/shared/ui/NotificationBell";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { formatDateTime } from "@/shared/utils/formatters";
import { CommentBody } from "./CommentBody";
import { reactionOf, type ExamComment } from "./exam-comments.api";

const ACTION = "md-state md-label-medium inline-flex min-h-10 items-center gap-1.5 px-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";
const CHIP = "md-label-small rounded-m3-xs bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 font-semibold";

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

const joinedText = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `Tham gia tháng ${d.getMonth() + 1}/${d.getFullYear()}` : undefined;
};

// Một bình luận hoặc phản hồi, dùng chung cho khung xem ảnh và khu trao đổi cuối trang.
// Nội dung có định dạng Markdown (xem CommentBody: không HTML thô, không ảnh ngoài).
export function CommentItem({ c, reported, highlight, onReact, onReply, onReport, onDelete, children }: CommentItemProps) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight) body.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  const approved = c.status === "APPROVED";
  const reply = !!c.parentId;
  const reaction = reactionOf(c);
  const likes = c.likes ?? 0;
  const dislikes = c.dislikes ?? 0;
  const about = [joinedText(c.author.joinedAt), c.author.commentCount != null && `${c.author.commentCount} bình luận`].filter(Boolean).join(" · ");
  const menu: MenuItem[] = [
    ...(approved && !c.mine ? [{ label: reported ? "Đã báo cáo" : "Báo cáo", icon: <Flag size={16} />, onClick: onReport, disabled: reported }] : []),
    ...(c.mine ? [{ label: "Xoá", icon: <Trash2 size={16} />, onClick: onDelete, danger: true }] : []),
  ];
  const vote = (on: boolean) => `${ACTION} rounded-full ${on ? "bg-surface-container-highest font-bold text-on-surface" : "text-on-surface-variant"}`;

  return (
    <li id={`comment-${c.id}`} className="flex gap-3">
      <UserAvatar src={c.author.avatarUrl} alt="" className={reply ? "h-7 w-7" : "h-10 w-10"} />
      <div className="min-w-0 flex-1">
        <div ref={body} className={`rounded-m3-lg transition-colors duration-500 ${highlight ? "-mx-2 bg-surface-container-high px-2 py-1 ring-1 ring-outline" : ""}`}>
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="md-title-small break-words text-on-surface" title={about || undefined}>
                {c.author.name}
              </span>
              {c.author.isAdmin && <span className={CHIP}>Quản trị</span>}
              {c.author.isPro && <span className={CHIP}>PRO</span>}
              {c.mine && <span className={CHIP}>Bạn</span>}
              <time dateTime={c.createdAt} title={formatDateTime(c.createdAt)} className="md-body-small text-on-surface-variant">
                {timeAgo(c.createdAt)}
              </time>
              {c.mine && c.status === "PENDING" && <Badge tone="warning">Chờ duyệt</Badge>}
              {c.mine && c.status === "REJECTED" && <Badge tone="danger">Bị từ chối</Badge>}
            </div>
            {menu.length > 0 && <CommentMenu name={c.author.name} items={menu} />}
          </div>
          {c.replyTo && (
            <p className="md-body-small mt-0.5 flex max-w-full items-center gap-1 text-on-surface-variant">
              <CornerDownRight size={12} aria-hidden />
              <span className="truncate">Trả lời {c.replyTo.name}</span>
            </p>
          )}
          <CommentBody body={c.body} className="mt-1" />
        </div>

        {approved && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <div className="-ml-3 inline-flex items-center">
              <button type="button" onClick={() => onReact("like")} aria-pressed={reaction === "like"} aria-label={`Thích bình luận của ${c.author.name}, ${likes} lượt`} className={vote(reaction === "like")}>
                <ThumbsUp size={15} className={reaction === "like" ? "fill-current" : ""} aria-hidden />
                <span className="tabular-nums">{likes}</span>
              </button>
              <button type="button" onClick={() => onReact("dislike")} aria-pressed={reaction === "dislike"} aria-label={`Không thích bình luận của ${c.author.name}, ${dislikes} lượt`} className={vote(reaction === "dislike")}>
                <ThumbsDown size={15} className={reaction === "dislike" ? "fill-current" : ""} aria-hidden />
                <span className="tabular-nums">{dislikes}</span>
              </button>
            </div>
            <button type="button" onClick={onReply} aria-label={`Trả lời ${c.author.name}`} className={`${ACTION} rounded-full text-on-surface-variant`}>
              <Reply size={15} aria-hidden />
              Trả lời
            </button>
          </div>
        )}
        {children}
      </div>
    </li>
  );
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

// Nút "…": Báo cáo (bình luận người khác) hoặc Xoá (của mình)
function CommentMenu({ name, items }: { name: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  // Đóng bằng bàn phím hay chọn một mục: trả focus về nút "…" (hộp xác nhận mở sau đó sẽ trả focus về đây)
  const close = () => {
    setOpen(false);
    wrap.current?.querySelector("button")?.focus();
  };

  // Bấm ra ngoài thì đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      ref={wrap}
      className="relative -my-2 shrink-0"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        e.stopPropagation();
        close();
      }}
    >
      <IconButton label={`Thao tác khác với bình luận của ${name}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={18} />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-m3-md bg-surface-container p-1 shadow-m3-2 ring-1 ring-outline-variant/50">
          {items.map((i, n) => (
            <button
              key={i.label}
              type="button"
              autoFocus={n === 0}
              disabled={i.disabled}
              onClick={() => {
                close();
                i.onClick();
              }}
              className={`md-state md-body-medium flex min-h-10 w-full items-center gap-2.5 rounded-m3-sm px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${i.danger ? "text-error" : "text-on-surface"}`}
            >
              {i.icon}
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
