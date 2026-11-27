import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Loader2, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button, buttonClass, IconButton } from "@/shared/ui/Button";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { ErrorBox, Spinner } from "@/shared/ui/Feedback";
import { AnswerPoll } from "./AnswerPoll";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { commentApi, type ExamComment, type Reactions } from "./exam-comments.api";

interface Props {
  examId: string;
  examTitle: string;
  question: number; // đích bình luận: câu (dương) hoặc tệp đính kèm (-id)
  position: string; // "Ảnh n/N" hoặc tên tệp
  poll: boolean; // chỉ ảnh câu hỏi thật mới có bình chọn đáp án
  closeAlways?: boolean; // nút đóng hiện cả trên máy tính (khung mở trong hộp thoại)
  onChanged: () => void; // số bình luận của câu đổi: trang tải lại bộ đếm
  onUnavailable: () => void; // 404 (không có quyền / máy chủ cũ): trình xem ảnh ẩn khung
  onHide: () => void;
}

// 404 = khung thảo luận không dùng được ở đây
async function orGone<T>(p: Promise<T>): Promise<T | "gone"> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return "gone";
    throw err;
  }
}

interface List {
  items: ExamComment[];
  page: number;
  totalPages: number;
  total: number;
}

// Khung thảo luận của MỘT câu (nơi gọi đặt key theo câu, nên đổi ảnh là trạng thái, bản nháp và phản hồi cũ đều bỏ)
export function DiscussionPanel({ examId, examTitle, question, position, poll, closeAlways, onChanged, onUnavailable, onHide }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, confirmDialog } = useConfirm();
  const canAct = !!user?.emailVerifiedAt;
  const from = location.pathname + location.search;

  const reactions = useApi(() => orGone(commentApi.reactions(examId, question)), [examId, question]);
  const first = useApi(() => orGone(commentApi.list(examId, question, 1)), [examId, question]);
  const [r, setR] = useState<Reactions | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [voting, setVoting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (reactions.data === "gone" || first.data === "gone") onUnavailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phản ứng khi dữ liệu về
  }, [reactions.data, first.data]);
  useEffect(() => {
    if (reactions.data && reactions.data !== "gone") setR(reactions.data);
  }, [reactions.data]);
  useEffect(() => {
    const d = first.data;
    if (d && d !== "gone") setList({ items: d.items, page: 1, totalPages: d.meta?.totalPages ?? 1, total: d.meta?.total ?? d.items.length });
  }, [first.data]);

  // Khách / chưa xác minh: chỉ xem; bấm thao tác thì nhắc đăng nhập hoặc xác minh
  const gate = () => {
    if (canAct) return true;
    if (!user) toast.error("Đăng nhập để bình chọn, thích và bình luận", { action: { label: "Đăng nhập", onClick: () => navigate("/login", { state: { from } }) } });
    else toast.error("Xác minh email để bình chọn, thích và bình luận");
    return false;
  };

  const fail = (fallback: string) => (err: unknown) => toast.error(errorMessage(err, fallback));
  const patchItem = (id: string, patch: Partial<ExamComment>) => setList((l) => l && { ...l, items: l.items.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const likeQuestion = () => {
    if (!gate() || !r) return;
    commentApi.likeQuestion(examId, question, !r.liked).then((res) => setR((p) => p && { ...p, ...res }), fail("Chưa thích được"));
  };

  const vote = (answers: string[]) => {
    if (!gate() || !poll) return;
    setVoting(true);
    commentApi
      .vote(examId, question, answers)
      .then((votes) => setR((p) => p && { ...p, votes }), fail("Chưa bình chọn được"))
      .finally(() => setVoting(false));
  };

  const post = async (body: string) => {
    const c = await commentApi.create(examId, question, body);
    setList((l) => l && { ...l, items: [c, ...l.items], total: l.total + (c.status === "APPROVED" ? 1 : 0) });
    if (poll) reactions.reload(); // máy chủ tự bình chọn khi bình luận mở đầu bằng chữ đáp án
    if (c.status === "APPROVED") onChanged();
    else toast.success("Đã gửi, bình luận sẽ hiện với mọi người sau khi được duyệt");
  };

  const likeComment = (c: ExamComment) => {
    if (!gate()) return;
    commentApi.like(examId, c.id, !c.liked).then((res) => patchItem(c.id, res), fail("Chưa thích được bình luận"));
  };

  const report = async (c: ExamComment) => {
    if (!gate()) return;
    if (!(await confirm({ title: "Báo cáo bình luận này?", message: "Quản trị viên sẽ xem và gỡ nếu bình luận không phù hợp.", confirmLabel: "Báo cáo" }))) return;
    try {
      await commentApi.report(examId, c.id);
      setReported((s) => new Set(s).add(c.id));
      toast.success("Đã gửi báo cáo, cảm ơn bạn");
    } catch (err) {
      fail("Chưa gửi được báo cáo")(err);
    }
  };

  const remove = async (c: ExamComment) => {
    if (!(await confirm({ title: "Xoá bình luận này?", message: "Bình luận sẽ bị xoá hẳn, không khôi phục được.", confirmLabel: "Xoá", tone: "danger" }))) return;
    try {
      await commentApi.remove(examId, c.id);
      setList((l) => l && { ...l, items: l.items.filter((x) => x.id !== c.id), total: l.total - (c.status === "APPROVED" ? 1 : 0) });
      if (c.status === "APPROVED") onChanged();
    } catch (err) {
      fail("Chưa xoá được bình luận")(err);
    }
  };

  const more = async () => {
    if (!list) return;
    setLoadingMore(true);
    try {
      const next = await commentApi.list(examId, question, list.page + 1);
      setList((l) => {
        if (!l) return l;
        const have = new Set(l.items.map((c) => c.id));
        return { ...l, items: [...l.items, ...next.items.filter((c) => !have.has(c.id))], page: l.page + 1, totalPages: next.meta?.totalPages ?? l.totalPages };
      });
    } catch (err) {
      fail("Chưa tải thêm được bình luận")(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const error = reactions.error ?? first.error;
  const retry = () => {
    if (reactions.error) reactions.reload();
    if (first.error) first.reload();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface text-on-surface">
      {confirmDialog}
      <div className="flex items-start gap-2 border-b border-outline-variant px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="md-title-small line-clamp-2 break-words text-on-surface">{examTitle}</h2>
          <p className="md-body-small text-on-surface-variant">{position}</p>
        </div>
        <IconButton label={closeAlways ? "Đóng" : "Ẩn thảo luận"} onClick={onHide} className={closeAlways ? "" : "lg:hidden"}>
          <X size={20} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
        {error ? (
          <ErrorBox message={error} onRetry={retry} />
        ) : !r || !list ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            <Button size="sm" variant={r.liked ? "tonal" : "outlined"} onClick={likeQuestion} aria-pressed={r.liked} aria-label={`Thích, ${r.likes} lượt thích`}>
              <Heart size={16} className={r.liked ? "fill-current" : ""} aria-hidden /> Thích{r.likes > 0 && ` · ${r.likes}`}
            </Button>
            {poll && r.votes && <AnswerPoll votes={r.votes} busy={voting} onVote={vote} />}
            <section aria-label="Bình luận" className="space-y-3">
              <h3 className="md-title-small text-on-surface">
                Bình luận <span className="font-normal text-on-surface-variant">· {list.total}</span>
              </h3>
              {list.items.length === 0 ? (
                <p className="md-body-medium text-on-surface-variant">Chưa có bình luận nào.</p>
              ) : (
                <ul className="space-y-3">
                  {list.items.map((c) => (
                    <CommentItem key={c.id} c={c} reported={reported.has(c.id)} onLike={() => likeComment(c)} onReport={() => void report(c)} onDelete={() => void remove(c)} />
                  ))}
                </ul>
              )}
              {list.page < list.totalPages && (
                <Button size="sm" variant="text" onClick={() => void more()} disabled={loadingMore}>
                  {loadingMore && <Loader2 size={16} className="animate-spin" />} Xem thêm
                </Button>
              )}
            </section>
          </>
        )}
      </div>

      <div className="border-t border-outline-variant px-3 py-2">
        {canAct ? (
          <CommentComposer onSend={post} hint={poll} />
        ) : user ? (
          <VerifyEmailNotice variant="inline" message="Xác minh email để bình chọn, thích và bình luận." />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
            <p className="md-body-medium text-on-surface-variant">Đăng nhập để bình chọn và bình luận.</p>
            <Link to="/login" state={{ from }} className={buttonClass({ variant: "filled", size: "sm" })}>
              Đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
