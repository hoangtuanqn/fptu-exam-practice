import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import type { Paged } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { commentApi, type ExamComment } from "./exam-comments.api";

type Patch = (id: string, patch: Partial<ExamComment>) => void;

// Thao tác dùng chung do khung thảo luận cung cấp (nhắc đăng nhập, xác nhận, báo lỗi)
export interface CommentActions {
  gate: () => boolean;
  react: (c: ExamComment, kind: "like" | "dislike", patch: Patch) => void;
  report: (c: ExamComment) => void;
  remove: (c: ExamComment, onRemoved: () => void) => void;
  posted: (c: ExamComment) => void;
  reported: (id: string) => boolean;
}

interface Replies {
  items: ExamComment[];
  page: number;
  totalPages: number;
}

interface Props {
  root: ExamComment;
  examId: string;
  question: number;
  act: CommentActions;
  patch: Patch; // cập nhật bình luận gốc (số phản hồi, cảm xúc) trong danh sách của khung
  onRemoved: () => void;
  highlightId?: string | null;
  preload?: Paged<ExamComment>; // mở từ thông báo tới một phản hồi: trang phản hồi đầu đã tải sẵn
}

// Bình luận gốc kèm phản hồi: mọi phản hồi (kể cả trả lời phản hồi) nằm phẳng một cấp thụt lề, cũ trước
export function CommentThread({ root, examId, question, act, patch, onRemoved, highlightId, preload }: Props) {
  const [replies, setReplies] = useState<Replies | null>(preload ? { items: preload.items, page: 1, totalPages: preload.meta?.totalPages ?? 1 } : null);
  const [open, setOpen] = useState(!!preload);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<ExamComment | null>(null);
  const count = root.replyCount ?? 0;
  const toast = useToast();

  const merge = (data: Paged<ExamComment>, page: number) =>
    setReplies((r) => {
      const have = new Set(r?.items.map((c) => c.id));
      return { items: [...(r?.items ?? []), ...data.items.filter((c) => !have.has(c.id))], page, totalPages: data.meta?.totalPages ?? 1 };
    });

  const load = async (page: number) => {
    setLoading(true);
    try {
      merge(await commentApi.replies(examId, root.id, page), page);
    } catch (err) {
      toast.error(errorMessage(err, "Chưa tải được phản hồi"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (!replies) void load(1).catch(() => setOpen(false));
  };

  const startReply = (to: ExamComment) => act.gate() && setReplyTo(to);

  const send = async (body: string) => {
    if (!replyTo) return;
    const c = await commentApi.create(examId, question, body, replyTo.id);
    if (!replies) await load(1).catch(() => undefined); // để phản hồi mới nằm sau các phản hồi cũ
    setReplies((r) => (r?.items.some((x) => x.id === c.id) ? r : { page: r?.page ?? 1, totalPages: r?.totalPages ?? 1, items: [...(r?.items ?? []), c] }));
    setOpen(true);
    setReplyTo(null);
    if (c.status === "APPROVED") patch(root.id, { replyCount: count + 1 });
    act.posted(c);
  };

  const patchReply: Patch = (id, p) => setReplies((r) => r && { ...r, items: r.items.map((c) => (c.id === id ? { ...c, ...p } : c)) });

  const item = (c: ExamComment, isRoot: boolean, children?: ReactNode) => (
    <CommentItem
      key={c.id}
      c={c}
      reported={act.reported(c.id)}
      highlight={highlightId === c.id}
      onReact={(kind) => act.react(c, kind, isRoot ? patch : patchReply)}
      onReply={() => startReply(c)}
      onReport={() => act.report(c)}
      onDelete={() =>
        act.remove(c, () => {
          if (isRoot) return onRemoved();
          setReplies((r) => r && { ...r, items: r.items.filter((x) => x.id !== c.id) });
          if (c.status === "APPROVED") patch(root.id, { replyCount: Math.max(0, count - 1) });
        })
      }
    >
      {children}
    </CommentItem>
  );

  return item(
    root,
    true,
    <>
      {count > 0 && (
        <button type="button" onClick={toggle} aria-expanded={open} className="md-state md-label-medium inline-flex min-h-10 items-center gap-1 rounded-full px-3 font-semibold text-primary">
          {loading && !replies ? <Loader2 size={15} className="animate-spin" aria-hidden /> : open ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
          {open ? "Ẩn phản hồi" : `Xem ${count} phản hồi`}
        </button>
      )}
      {open && replies && replies.items.length > 0 && <ul className="mt-2 space-y-4 border-l-2 border-primary-container pl-3 sm:pl-4">{replies.items.map((r) => item(r, false))}</ul>}
      {open && replies && replies.page < replies.totalPages && (
        <Button size="sm" variant="text" disabled={loading} onClick={() => void load(replies.page + 1).catch(() => undefined)}>
          {loading && <Loader2 size={16} className="animate-spin" />} Xem thêm phản hồi
        </Button>
      )}
      {replyTo && (
        <div className="mt-2">
          <CommentComposer key={replyTo.id} onSend={send} hint={false} label={`Trả lời ${replyTo.author.name}`} autoFocus onCancel={() => setReplyTo(null)} />
        </div>
      )}
    </>,
  );
}
