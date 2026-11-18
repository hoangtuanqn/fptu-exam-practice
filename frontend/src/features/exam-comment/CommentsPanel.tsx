import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Badge } from "@/shared/ui/Badge";
import { Button, IconButton, buttonClass } from "@/shared/ui/Button";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty, ErrorBox } from "@/shared/ui/Feedback";
import { formatDateTime, initials } from "@/shared/utils/formatters";
import { COMMENT_MAX, examCommentApi, type ExamComment } from "./exam-comment.api";

const TINTS = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-success-container text-on-success-container",
  "bg-warning-container text-on-warning-container",
];
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });

// Danh sách bình luận của một câu, có "Xem thêm"; đổi câu thì tải lại từ trang 1 (bỏ kết quả của câu cũ về muộn)
function useComments(examId: string, question: number) {
  const [items, setItems] = useState<ExamComment[]>([]);
  const [page, setPage] = useState(0); // trang đã tải gần nhất
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ticket = useRef(0);

  const load = useCallback(
    (p: number) => {
      const mine = ++ticket.current;
      setLoading(true);
      setError(null);
      examCommentApi
        .list(examId, question, p)
        .then(({ items: got, meta }) => {
          if (mine !== ticket.current) return;
          setItems((prev) => (p === 1 ? got : [...prev, ...got.filter((x) => !prev.some((y) => y.id === x.id))]));
          setPage(p);
          setTotalPages(meta?.totalPages ?? 1);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (mine !== ticket.current) return;
          setError(errorMessage(err, "Chưa tải được bình luận. Bạn bấm Thử lại nhé."));
          setLoading(false);
        });
    },
    [examId, question],
  );

  useEffect(() => {
    setItems([]);
    setPage(0);
    setTotalPages(0);
    load(1);
  }, [load]);

  return { items, setItems, page, totalPages, loading, error, load };
}

interface Props {
  examId: string;
  question: number;
  onApprovedDelta: (question: number, delta: number) => void; // xoá bình luận đã duyệt: giảm số trên ảnh thu nhỏ
  children?: ReactNode; // nội dung phía trên danh sách (thông tin đề)
}

// Phần thân khung bình luận của câu đang xem: danh sách (cuộn) + ô viết bình luận (dính đáy trên máy tính)
export function CommentsPanel({ examId, question, onApprovedDelta, children }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const { confirm, confirmDialog } = useConfirm();
  const list = useComments(examId, question);
  const current = useRef(question);
  current.current = question;
  const [drafts, setDrafts] = useState<Record<number, string>>({}); // nháp theo từng câu: đổi câu không mất chữ đang gõ
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<{ q: number; message: string; verify: boolean } | null>(null);
  const draft = drafts[question] ?? "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = question;
    const body = draft.trim();
    if (!body || sending || !user) return;
    setSending(true);
    setSendError(null);
    try {
      const created = await examCommentApi.create(examId, q, body);
      const item: ExamComment = { id: `local-${Date.now()}`, questionNumber: q, body, status: "PENDING", createdAt: new Date().toISOString(), author: { name: user.fullName, avatarUrl: null }, mine: true, ...created };
      if (current.current === q) list.setItems((prev) => [item, ...prev]);
      setDrafts((d) => ({ ...d, [q]: "" }));
    } catch (err) {
      setSendError({ q, message: errorMessage(err, "Chưa gửi được bình luận. Bạn thử lại nhé."), verify: err instanceof ApiError && err.status === 403 });
    } finally {
      setSending(false);
    }
  };

  const remove = async (c: ExamComment) => {
    if (!(await confirm({ title: "Xoá bình luận này?", message: "Bình luận sẽ bị xoá hẳn, không khôi phục được.", confirmLabel: "Xoá", tone: "danger" }))) return;
    try {
      await examCommentApi.remove(examId, c.id);
      list.setItems((prev) => prev.filter((x) => x.id !== c.id));
      if (c.status === "APPROVED") onApprovedDelta(c.questionNumber, -1);
      toast.success("Đã xoá bình luận");
    } catch (err) {
      toast.error(errorMessage(err, "Chưa xoá được bình luận"));
    }
  };

  const firstLoad = list.loading && list.page === 0;
  const error = sendError?.q === question ? sendError : null;

  return (
    <>
      <div className="px-4 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {children}
        {firstLoad ? (
          <ul aria-label="Đang tải bình luận" className="space-y-4 pt-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex animate-pulse gap-3">
                <span className="h-9 w-9 shrink-0 rounded-full bg-surface-container-high" />
                <span className="flex-1 space-y-2 pt-1">
                  <span className="block h-3 w-1/3 rounded bg-surface-container-high" />
                  <span className="block h-3 w-4/5 rounded bg-surface-container-high" />
                </span>
              </li>
            ))}
          </ul>
        ) : list.error && list.items.length === 0 ? (
          <ErrorBox message={list.error} onRetry={() => list.load(list.page + 1)} />
        ) : list.items.length === 0 ? (
          <Empty icon={MessageSquare} title="Chưa có bình luận cho câu này. Hãy là người đầu tiên." />
        ) : (
          <>
            <ul className="space-y-2 pt-2">
              {list.items.map((c) => (
                <CommentItem key={c.id} c={c} onDelete={c.mine && !c.id.startsWith("local-") ? () => void remove(c) : undefined} />
              ))}
            </ul>
            {list.error && <p role="alert" className="md-body-small mt-2 text-error">{list.error}</p>}
            {(list.page < list.totalPages || list.error) && (
              <Button size="sm" variant="text" className="mt-2" disabled={list.loading} onClick={() => list.load(list.page + 1)}>
                {list.loading ? "Đang tải…" : list.error ? "Thử lại" : "Xem thêm"}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="border-t border-outline-variant bg-surface px-4 py-3">
        {user ? (
          <form onSubmit={(e) => void submit(e)}>
            <label htmlFor="comment-box" className="sr-only">
              Bình luận cho câu {question}
            </label>
            <textarea
              id="comment-box"
              value={draft}
              onChange={(e) => setDrafts((d) => ({ ...d, [question]: e.target.value }))}
              maxLength={COMMENT_MAX}
              rows={3}
              disabled={sending}
              placeholder="Viết bình luận…"
              className="md-body-medium block w-full resize-y rounded-m3-sm border border-outline bg-surface-container-lowest px-3 py-2 text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            {error && (
              <p role="alert" className="md-body-small mt-2 text-error">
                {error.message}{" "}
                {error.verify && (
                  <Link to="/account/profile" className="font-medium underline">
                    Mở hồ sơ để xác minh email
                  </Link>
                )}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <p className="md-body-small min-w-0 flex-1 text-on-surface-variant">Bình luận sẽ hiển thị sau khi quản trị viên duyệt.</p>
              <span className="md-body-small shrink-0 tabular-nums text-on-surface-variant" aria-hidden>
                {draft.length}/{COMMENT_MAX}
              </span>
              <Button type="submit" size="sm" variant="filled" disabled={sending || !draft.trim()}>
                <Send size={16} /> {sending ? "Đang gửi…" : "Gửi"}
              </Button>
            </div>
          </form>
        ) : (
          <Link to="/login" state={{ from: location.pathname + location.search }} className={buttonClass({ variant: "tonal", className: "w-full" })}>
            Đăng nhập để bình luận
          </Link>
        )}
      </div>
      {confirmDialog}
    </>
  );
}

function CommentItem({ c, onDelete }: { c: ExamComment; onDelete?: () => void }) {
  const name = c.author?.name || "Thành viên";
  const tint = TINTS[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % TINTS.length];
  return (
    <li className="flex gap-3 rounded-m3-md bg-surface-container-low p-3">
      {c.author?.avatarUrl ? (
        <img src={c.author.avatarUrl} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden className={`md-label-large inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}>
          {initials(name) || "?"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="md-label-large truncate text-on-surface">{name}</span>
          <time dateTime={c.createdAt} title={formatDateTime(c.createdAt)} className="md-body-small text-on-surface-variant">
            {shortDate(c.createdAt)}
          </time>
          {c.mine && c.status === "PENDING" && <Badge tone="warning">Chờ quản trị viên duyệt</Badge>}
          {c.mine && c.status === "REJECTED" && <Badge>Không được duyệt</Badge>}
        </div>
        {/* Văn bản thuần, giữ xuống dòng; React tự thoát ký tự nên không chèn được HTML */}
        <p className="md-body-medium mt-1 whitespace-pre-wrap break-words text-on-surface">{c.body}</p>
      </div>
      {onDelete && (
        <IconButton label="Xoá bình luận" onClick={onDelete} className="-mr-1 -mt-1">
          <Trash2 size={18} />
        </IconButton>
      )}
    </li>
  );
}
