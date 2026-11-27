import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessagesSquare } from "lucide-react";
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
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
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
  const [order, setOrder] = useState<CommentOrder>("newest");
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
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="md-title-large flex items-center gap-2 text-on-surface">
          Góc trao đổi
          {list && <span className="md-title-medium font-normal tabular-nums text-on-surface-variant">· {list.total}</span>}
        </h2>
        {list && list.total > 1 && <Segmented label="Sắp xếp bình luận" value={order} options={ORDERS} onChange={setOrder} />}
      </header>

      {canAct ? (
        <CommentComposer roomy examId={examId} onSend={post} hint={false} />
      ) : user ? (
        <VerifyEmailNotice variant="inline" message="Xác minh email để thích và bình luận." />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-m3-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <p className="md-body-medium text-on-surface-variant">Đăng nhập để tham gia trao đổi.</p>
          <Link to="/login" state={{ from }} className={buttonClass({ variant: "filled", size: "sm" })}>
            Đăng nhập
          </Link>
        </div>
      )}

      <div className="mt-6">
        {first.error && !list ? (
          <ErrorBox message={first.error} onRetry={first.reload} />
        ) : !list ? (
          <PostsSkeleton />
        ) : list.items.length === 0 ? (
          <Empty icon={MessagesSquare} title="Chưa ai mở lời">
            Hãy là người đầu tiên chia sẻ cách giải hay thắc mắc về đề này.
          </Empty>
        ) : (
          <ul aria-busy={first.loading} className={`divide-y divide-outline-variant/60 rounded-m3-lg bg-surface-container-lowest ring-1 ring-outline-variant/60 transition-opacity duration-200 [&>li]:p-4 ${first.loading ? "opacity-60" : ""}`}>
            {list.items.map((c) => (
              <CommentThread
                rich
                key={preload?.rootId === c.id ? `${c.id}:open` : c.id}
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
      </div>

      {list && list.page < list.totalPages && (
        <div className="mt-2 flex justify-center">
          <Button variant="tonal" onClick={() => void more()} disabled={loadingMore}>
            {loadingMore && <Loader2 size={16} className="animate-spin" />} Xem thêm bình luận
          </Button>
        </div>
      )}
    </>
  );
}

function PostsSkeleton() {
  return (
    <SkeletonWrap label="Đang tải bình luận…">
      <div className="space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 shrink-0 !rounded-full" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonWrap>
  );
}
