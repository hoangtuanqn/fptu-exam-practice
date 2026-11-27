import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button, buttonClass, IconButton } from "@/shared/ui/Button";
import { ErrorBox, Spinner } from "@/shared/ui/Feedback";
import { AnswerPoll } from "./AnswerPoll";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";
import { commentApi, type Reactions } from "./exam-comments.api";
import { orGone, useCommentList } from "./useCommentList";

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
  focusComment?: string | null; // mở từ thông báo: cuộn tới bình luận / phản hồi này nếu tìm thấy
}

// Khung thảo luận của MỘT câu (nơi gọi đặt key theo câu, nên đổi ảnh là trạng thái, bản nháp và phản hồi cũ đều bỏ)
export function DiscussionPanel({ examId, examTitle, question, position, poll, closeAlways, onChanged, onUnavailable, onHide, focusComment }: Props) {
  const toast = useToast();
  const reactions = useApi(() => orGone(commentApi.reactions(examId, question)), [examId, question]);
  const { user, canAct, from, first, gone, list, loadingMore, more, post, act, patchItem, removeRoot, highlight, preload, confirmDialog, gate } = useCommentList({
    examId,
    question,
    focusComment,
    gateWhat: "bình chọn, thích và bình luận",
    onChanged,
    onPosted: poll ? reactions.reload : undefined, // máy chủ tự bình chọn khi bình luận mở đầu bằng chữ đáp án
  });
  const [r, setR] = useState<Reactions | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (reactions.data === "gone" || gone) onUnavailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phản ứng khi dữ liệu về
  }, [reactions.data, gone]);
  useEffect(() => {
    if (reactions.data && reactions.data !== "gone") setR(reactions.data);
  }, [reactions.data]);

  const vote = (answers: string[]) => {
    if (!gate() || !poll) return;
    setVoting(true);
    commentApi
      .vote(examId, question, answers)
      .then((votes) => setR((p) => p && { ...p, votes }), (err: unknown) => toast.error(errorMessage(err, "Chưa bình chọn được")))
      .finally(() => setVoting(false));
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
                    <CommentThread
                      key={preload?.rootId === c.id ? `${c.id}:open` : c.id}
                      root={c}
                      examId={examId}
                      question={question}
                      act={act}
                      patch={patchItem}
                      onRemoved={() => removeRoot(c)}
                      highlightId={highlight}
                      preload={preload?.rootId === c.id ? preload.data : undefined}
                    />
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
