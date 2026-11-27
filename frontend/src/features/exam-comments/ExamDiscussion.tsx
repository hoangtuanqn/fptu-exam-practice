import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquare, MessagesSquare } from "lucide-react";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Empty, ErrorBox } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Skeleton, SkeletonWrap } from "@/shared/ui/Skeleton";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";
import { EXAM_TARGET, type CommentOrder } from "./exam-comments.api";
import { useCommentList } from "./useCommentList";

interface Props {
  examId: string;
  focusComment?: string | null; // ?target=0&comment=ID: tải ngay, cuộn tới và làm nổi bật bình luận này
  onChanged: () => void; // số bình luận của đề đổi: trang tải lại bộ đếm
}

const ORDERS: { value: CommentOrder; label: string }[] = [
  { value: "oldest", label: "Cũ nhất" },
  { value: "newest", label: "Mới nhất" },
];
const NEAR_MARGIN = "600px"; // bắt đầu tải khi khu bình luận còn cách màn hình chừng này

// Bình luận chung của cả đề, cuối trang xem trước / xem đề. Chỉ tải khi người xem cuộn tới gần; không có quyền hoặc máy chủ cũ thì ẩn hẳn.
export function ExamDiscussion({ examId, focusComment, onChanged }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(!!focusComment);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (focusComment) setNear(true);
  }, [focusComment]);
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    if (typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: NEAR_MARGIN });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  if (gone) return null;
  return (
    <section ref={ref} id="binh-luan" aria-label="Bình luận" className="mt-10 scroll-mt-20">
      {near ? <Thread examId={examId} focusComment={focusComment} onChanged={onChanged} onGone={() => setGone(true)} /> : <div className="min-h-40" />}
    </section>
  );
}

function Thread({ examId, focusComment, onChanged, onGone }: Props & { onGone: () => void }) {
  const [order, setOrder] = useState<CommentOrder>("oldest");
  const { user, canAct, from, first, gone, list, loadingMore, more, post, act, patchItem, removeRoot, highlight, preload, confirmDialog } = useCommentList({
    examId,
    question: EXAM_TARGET,
    order,
    focusComment,
    gateWhat: "thích và bình luận",
    onChanged,
  });

  useEffect(() => {
    if (gone) onGone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phản ứng khi biết không dùng được
  }, [gone]);

  return (
    <>
      {confirmDialog}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container" aria-hidden>
            <MessagesSquare size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="md-title-large text-on-surface">
              Bình luận {list && <span className="font-normal tabular-nums text-on-surface-variant">· {list.total}</span>}
            </h2>
            <p className="md-body-medium text-on-surface-variant">Trao đổi chung về đề này</p>
          </div>
        </div>
        {list && list.total > 1 && <Segmented label="Sắp xếp bình luận" value={order} options={ORDERS} onChange={setOrder} />}
      </header>

      {first.error && !list ? (
        <ErrorBox message={first.error} onRetry={first.reload} />
      ) : !list ? (
        <PostsSkeleton />
      ) : list.items.length === 0 ? (
        <div className="rounded-m3-xl border border-dashed border-outline-variant bg-surface-container-low">
          <Empty icon={MessageSquare} title="Chưa có bình luận nào">
            Hãy là người đầu tiên chia sẻ cách giải hay thắc mắc về đề này.
          </Empty>
        </div>
      ) : (
        <ul aria-busy={first.loading} className={`space-y-4 transition-opacity duration-200 ${first.loading ? "opacity-60" : ""}`}>
          {list.items.map((c) => (
            <CommentThread
              key={preload?.rootId === c.id ? `${c.id}:open` : c.id}
              variant="forum"
              root={c}
              examId={examId}
              question={EXAM_TARGET}
              act={act}
              patch={patchItem}
              onRemoved={() => removeRoot(c)}
              highlightId={highlight}
              preload={preload?.rootId === c.id ? preload.data : undefined}
            />
          ))}
        </ul>
      )}

      {list && list.page < list.totalPages && (
        <div className="mt-4 flex justify-center">
          <Button variant="tonal" onClick={() => void more()} disabled={loadingMore}>
            {loadingMore && <Loader2 size={16} className="animate-spin" />} Xem thêm bình luận
          </Button>
        </div>
      )}

      <div className="mt-6">
        {canAct ? (
          <CommentComposer variant="card" onSend={post} hint={false} />
        ) : user ? (
          <VerifyEmailNotice variant="inline" message="Xác minh email để thích và bình luận." />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-m3-xl bg-surface-container-low px-4 py-3 ring-1 ring-outline-variant/60">
            <p className="md-body-medium text-on-surface-variant">Đăng nhập để tham gia bình luận.</p>
            <Link to="/login" state={{ from }} className={buttonClass({ variant: "filled", size: "sm" })}>
              Đăng nhập
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

function PostsSkeleton() {
  return (
    <SkeletonWrap label="Đang tải bình luận…">
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-m3-xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50 sm:flex-row sm:gap-5">
            <div className="flex items-center gap-3 sm:w-40 sm:flex-col">
              <Skeleton className="h-10 w-10 !rounded-full sm:h-16 sm:w-16" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <div className="flex-1 space-y-2.5 sm:pt-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonWrap>
  );
}
