import { useEffect, useRef, useState, type ReactNode } from "react";
import { Flag, Gem, MoreHorizontal, Reply, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { IconButton } from "@/shared/ui/Button";
import { timeAgo } from "@/shared/ui/NotificationBell";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { formatDateTime } from "@/shared/utils/formatters";
import type { CommentItemProps } from "./CommentItem";
import { reactionOf, type ExamComment } from "./exam-comments.api";

const ACTION = "md-state md-label-medium inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary";
const HIGHLIGHT = "ring-2 ring-primary shadow-m3-3";

const joinedText = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `Tham gia tháng ${d.getMonth() + 1} năm ${d.getFullYear()}` : null;
};

// Một bài trong bình luận chung của đề (kiểu diễn đàn). Bình luận gốc: thẻ hai cột (cột tác giả bên trái, trên điện thoại gọn thành một hàng đầu thẻ);
// phản hồi: thẻ nhỏ lồng trong bài gốc. Nội dung là văn bản thuần (giữ xuống dòng, không HTML, không biến link thành liên kết).
export function ForumPost({ c, reported, highlight, onReact, onReply, onReport, onDelete, children }: CommentItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  const approved = c.status === "APPROVED";
  const stats = [c.author.commentCount != null && `Bình luận ${c.author.commentCount}`, joinedText(c.author.joinedAt)].filter((s): s is string => !!s);

  const name = (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="md-label-large break-words font-semibold text-on-surface">{c.author.name}</span>
      {c.author.isPro && <Gem size={14} className="text-primary" aria-label="Pro" role="img" />}
      {c.author.isAdmin && <Badge tone="info">Quản trị</Badge>}
    </span>
  );
  const status = (
    <>
      {c.mine && c.status === "PENDING" && <Badge tone="warning">Chờ duyệt</Badge>}
      {c.mine && c.status === "REJECTED" && <Badge tone="danger">Bị từ chối</Badge>}
    </>
  );
  const time = (
    <time dateTime={c.createdAt} title={formatDateTime(c.createdAt)}>
      {timeAgo(c.createdAt)}
    </time>
  );
  const text = (
    <p className={`whitespace-pre-wrap break-words text-on-surface ${c.parentId ? "md-body-medium mt-1.5" : "md-body-large mt-2"}`}>
      {c.replyTo && <span className="mr-1 font-medium text-primary">Trả lời {c.replyTo.name}</span>}
      {c.body}
    </p>
  );
  const footer = <Footer c={c} approved={approved} reported={reported} onReact={onReact} onReply={onReply} onReport={onReport} onDelete={onDelete} />;

  if (c.parentId)
    return (
      <li ref={ref} id={`comment-${c.id}`} className={`rounded-m3-lg bg-surface-container-low px-3 pb-1 pt-2.5 transition-shadow duration-300 sm:px-4 ${highlight ? HIGHLIGHT : ""}`}>
        <div className="flex items-center gap-2.5">
          <UserAvatar src={c.author.avatarUrl} alt="" className="h-8 w-8" />
          <div className="md-body-small flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-on-surface-variant">
            {name}
            {time}
            {status}
          </div>
        </div>
        {text}
        {footer}
      </li>
    );

  return (
    <li
      ref={ref}
      id={`comment-${c.id}`}
      className={`flex flex-col rounded-m3-xl bg-surface-container-lowest shadow-m3-1 ring-1 ring-outline-variant/50 transition-shadow duration-300 hover:shadow-m3-2 sm:flex-row ${highlight ? HIGHLIGHT : ""}`}
    >
      <aside className="flex items-center gap-3 rounded-t-m3-xl border-b border-outline-variant/50 bg-surface-container-low px-4 py-3 sm:w-44 sm:shrink-0 sm:flex-col sm:gap-2 sm:rounded-l-m3-xl sm:rounded-tr-none sm:border-b-0 sm:border-r sm:px-3 sm:py-5 sm:text-center md:w-48">
        <UserAvatar src={c.author.avatarUrl} alt="" className="h-10 w-10 sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1 sm:flex sm:flex-none sm:flex-col sm:items-center">
          {name}
          {stats.length > 0 && (
            <p className="md-body-small mt-0.5 flex flex-wrap gap-x-2 text-on-surface-variant sm:mt-1 sm:flex-col sm:items-center">
              {stats.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </p>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
        <div className="md-body-small flex flex-wrap items-center gap-2 text-on-surface-variant">
          {time}
          {status}
          {c.index != null && <span className="ml-auto font-medium tabular-nums">#{c.index}</span>}
        </div>
        {text}
        {footer}
        {children}
      </div>
    </li>
  );
}

type FooterProps = Pick<CommentItemProps, "reported" | "onReact" | "onReply" | "onReport" | "onDelete"> & { c: ExamComment; approved: boolean };

// Thích, Không thích, Trả lời và nút "…" (Báo cáo / Xoá). Bình luận chưa duyệt của mình chỉ còn Xoá.
function Footer({ c, approved, reported, onReact, onReply, onReport, onDelete }: FooterProps) {
  const reaction = reactionOf(c);
  const likes = c.likes ?? 0;
  const dislikes = c.dislikes ?? 0;
  const tone = (on: boolean) => (on ? "text-primary" : "text-on-surface-variant");
  const menu: MenuItem[] = [
    ...(approved && !c.mine ? [{ label: reported ? "Đã báo cáo" : "Báo cáo", icon: <Flag size={16} />, onClick: onReport, disabled: reported }] : []),
    ...(c.mine ? [{ label: "Xoá", icon: <Trash2 size={16} />, onClick: onDelete, danger: true }] : []),
  ];

  return (
    <div className="-ml-3 mt-1.5 flex flex-wrap items-center gap-0.5">
      {approved && (
        <>
          <button type="button" onClick={() => onReact("like")} aria-pressed={reaction === "like"} aria-label={`Thích bình luận của ${c.author.name}, ${likes} lượt`} className={`${ACTION} ${tone(reaction === "like")}`}>
            <ThumbsUp size={16} className={reaction === "like" ? "fill-current" : ""} aria-hidden />
            Thích
            {likes > 0 && <span className="tabular-nums">{likes}</span>}
          </button>
          <button type="button" onClick={() => onReact("dislike")} aria-pressed={reaction === "dislike"} aria-label={`Không thích bình luận của ${c.author.name}, ${dislikes} lượt`} className={`${ACTION} ${tone(reaction === "dislike")}`}>
            <ThumbsDown size={16} className={reaction === "dislike" ? "fill-current" : ""} aria-hidden />
            Không thích
            {dislikes > 0 && <span className="tabular-nums">{dislikes}</span>}
          </button>
          <button type="button" onClick={onReply} aria-label={`Trả lời ${c.author.name}`} className={`${ACTION} ${tone(false)}`}>
            <Reply size={16} aria-hidden />
            Trả lời
          </button>
        </>
      )}
      {menu.length > 0 && <PostMenu name={c.author.name} items={menu} />}
    </div>
  );
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

function PostMenu({ name, items }: { name: string; items: MenuItem[] }) {
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
      className="relative ml-auto"
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
