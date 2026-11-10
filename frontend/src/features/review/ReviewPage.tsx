import { Link } from "react-router-dom";
import { BookCheck, Crown, Flame, Lightbulb, NotebookPen, PenLine, Play, Trash2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { Segmented } from "@/shared/ui/Segmented";
import { dueText, reviewApi, studyApi, type ReviewRow } from "./review.api";
import { ReviewCapNotice } from "./ReviewCapNotice";
import { StudyStreakCard } from "./StudyStreakCard";
import { TopicReport } from "./TopicReport";
import { useConfirm } from "@/shared/ui/ConfirmDialog";

type Tab = "active" | "mastered" | "topics" | "progress";
const TABS: Tab[] = ["active", "mastered", "topics", "progress"];
const SESSION = 20;

// Năm vạch = năm lần ôn đúng để thuộc; đủ năm là "đã nhớ"
function Dots({ box, mastered }: { box: number; mastered: boolean }) {
  const done = mastered ? 5 : box - 1;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={mastered ? "Đã nhớ" : `Đã ôn đúng ${done} trên 5 lần`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-1.5 w-4 rounded-full ${i < done ? "bg-primary" : "bg-surface-container-highest"}`} />
      ))}
    </span>
  );
}

function Row({ r, onRemove }: { r: ReviewRow; onRemove: (r: ReviewRow) => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      {r.imageUrl && (
        <a href={r.imageUrl} target="_blank" rel="noreferrer" title="Xem ảnh câu hỏi" className="h-14 w-20 shrink-0 overflow-hidden rounded-m3-sm border border-outline-variant bg-surface-container-lowest sm:h-16 sm:w-28">
          <img src={r.imageUrl} alt={`Câu ${r.number}`} loading="lazy" className="h-full w-full object-cover object-top" />
        </a>
      )}
      <div className="min-w-0 flex-1">
        <Link to={`/exam/${r.threadId}`} className="md-title-small line-clamp-2 break-words text-on-surface hover:underline" title="Mở đề này">
          Câu {r.number} · {r.examTitle}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {r.mastered ? (
            <span className="md-body-small font-medium text-success">Đã nhớ</span>
          ) : (
            <span className={`md-body-small font-medium ${r.due ? "text-error" : "text-on-surface-variant"}`}>{r.due ? "Đến hạn ôn hôm nay" : dueText(r.nextReviewAt)}</span>
          )}
          <Dots box={r.box} mastered={r.mastered} />
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <Button size="sm" variant="text" onClick={() => onRemove(r)} aria-label={`Bỏ câu ${r.number} khỏi sổ`} title="Mình nhớ rồi, bỏ khỏi sổ">
          <Trash2 size={16} />
        </Button>
      </div>
    </li>
  );
}

// Sổ câu sai: một việc chính ("Bắt đầu ôn") ở đầu trang; danh sách, chủ đề và tiến độ nằm ở các mục bên dưới
export default function ReviewPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ page: "1", tab: "active" });
  const tab: Tab = (TABS as string[]).includes(url.tab) ? (url.tab as Tab) : "active";
  const page = toPage(url.page);

  const { confirm, confirmDialog } = useConfirm();
  const summary = useApi(() => reviewApi.summary(), []);
  const streak = useApi(() => studyApi.stats(), []);
  const isList = tab === "active" || tab === "mastered";
  const list = useApi(() => (isList ? reviewApi.list(page, tab as "active" | "mastered") : Promise.resolve(null)), [page, tab]);
  useClampPage(list.data?.meta, (p) => setUrl({ page: String(p) }));

  const s = summary.data;
  const atLimit = !!s && s.limit !== null && s.total >= s.limit;
  const batch = s ? Math.min(s.due, SESSION) : 0;
  const cta = buttonClass({ variant: "primary", className: "!h-12 !px-8 text-base" });

  const remove = async (row: ReviewRow) => {
    if (!(await confirm({ title: "Bỏ câu này khỏi sổ?", message: "Câu sẽ bị xoá khỏi sổ câu sai cùng lịch ôn của nó và không khôi phục được. Lần sau làm sai lại thì câu mới tự vào sổ.", confirmLabel: "Bỏ khỏi sổ", tone: "danger" }))) return;
    await reviewApi
      .remove(row.id)
      .then(() => {
        toast.success("Đã bỏ khỏi sổ");
        summary.reload();
        list.reload();
      })
      .catch((err: unknown) => toast.error(errorMessage(err, "Chưa bỏ được câu này")));
  };

  return (
    <div className="space-y-5">
      {confirmDialog}
      <PageHeader title="Sổ câu sai" description="Câu bạn làm sai tự được lưu ở đây và nhắc ôn lại đúng lúc để nhớ lâu." />

      {summary.error && <ErrorBox message={summary.error} onRetry={summary.reload} />}
      {!s && summary.loading && <Loading />}

      {s && (
        <Card>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              {s.due > 0 ? (
                <>
                  <p className="md-headline-medium tabular-nums text-on-surface">{s.due} câu cần ôn hôm nay</p>
                  <p className="md-body-large mt-1 text-on-surface-variant">Khoảng {Math.max(1, Math.round(batch * 0.4))} phút cho mỗi lượt {batch} câu.</p>
                </>
              ) : s.total > 0 ? (
                <>
                  <p className="md-headline-small text-on-surface">Hôm nay bạn đã ôn xong</p>
                  <p className="md-body-large mt-1 text-on-surface-variant">{s.nextDueAt ? `${dueText(s.nextDueAt)}. ` : ""}Muốn ôn thêm thì bấm nút bên cạnh.</p>
                </>
              ) : (
                <>
                  <p className="md-headline-small text-on-surface">Sổ đang trống</p>
                  <p className="md-body-large mt-1 text-on-surface-variant">Làm một đề rồi nộp bài, câu nào sai sẽ tự vào đây.</p>
                </>
              )}
              <p className="md-body-small mt-2 text-on-surface-variant">
                {s.total} câu đang ôn · {s.mastered} câu đã nhớ
              </p>
              {streak.data && streak.data.streak > 0 && (
                <p className="md-label-large mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-on-secondary-container">
                  <Flame size={15} /> {streak.data.streak} ngày học liên tiếp
                </p>
              )}
            </div>
            {s.due > 0 ? (
              <Link to="/account/review/practice" className={cta}>
                <Play size={18} /> Bắt đầu ôn
              </Link>
            ) : s.total > 0 ? (
              <Link to="/account/review/practice?all=1" className={cta}>
                <Play size={18} /> Ôn thêm
              </Link>
            ) : (
              <Link to="/" className={cta}>
                <PenLine size={18} /> Vào luyện đề
              </Link>
            )}
          </div>

          {atLimit && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-5 py-3">
              <p className="md-body-medium text-on-surface">Sổ đã đầy {s.limit} câu nên câu sai mới chưa được lưu. Ôn xong vài câu sẽ có chỗ, hoặc nâng cấp Pro để không bị giới hạn.</p>
              <Link to="/pro" className={buttonClass({ size: "sm" })}>
                <Crown size={15} className="text-[#f0a800]" /> Xem gói Pro
              </Link>
            </div>
          )}

          {!atLimit && <ReviewCapNotice total={s.total} limit={s.limit} />}

          <details className="border-t border-outline-variant">
            <summary className="md-label-large flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-on-surface-variant hover:text-on-surface">
              <Lightbulb size={16} /> Sổ câu sai hoạt động thế nào?
            </summary>
            <ol className="md-body-medium list-decimal space-y-1.5 pb-4 pl-10 pr-5 text-on-surface-variant">
              <li>Nộp bài xong, câu bạn sai hoặc bỏ qua tự vào sổ. Câu bạn đánh dấu phân vân cũng vào sổ dù làm đúng.</li>
              <li>Mỗi ngày bấm “Bắt đầu ôn”: hệ thống đưa ra những câu đến hạn, bạn chọn đáp án và biết đúng sai ngay.</li>
              <li>Ôn đúng thì lần sau xa hơn (1, 3, 7, 14 rồi 30 ngày), ôn sai thì quay lại vào ngày mai. Đúng đủ 5 lần là đã nhớ.</li>
            </ol>
          </details>
        </Card>
      )}

      <Segmented
        label="Mục xem"
        value={tab}
        options={[
          { value: "active", label: "Đang ôn" },
          { value: "mastered", label: "Đã nhớ" },
          { value: "topics", label: "Chủ đề" },
          { value: "progress", label: "Tiến độ" },
        ]}
        onChange={(v) => setUrl({ tab: v, page: "1" })}
      />

      {tab === "topics" && <TopicReport />}
      {tab === "progress" && <StudyStreakCard />}

      {isList && (
        <Card>
          {list.loading && !list.data ? (
            <Loading />
          ) : list.error ? (
            <ErrorBox message={list.error} onRetry={list.reload} />
          ) : !list.data || list.data.items.length === 0 ? (
            <Empty icon={tab === "active" ? NotebookPen : BookCheck} title={tab === "active" ? "Chưa có câu nào đang ôn" : "Chưa có câu nào đã nhớ"}>
              {tab === "active" ? "Nộp bài ở một đề, câu sai sẽ được thêm vào đây." : "Câu nào bạn ôn đúng đủ 5 lần sẽ nằm ở đây."}
            </Empty>
          ) : (
            <>
              <ul className="divide-y divide-outline-variant">
                {list.data.items.map((r) => (
                  <Row key={r.id} r={r} onRemove={(row) => void remove(row)} />
                ))}
              </ul>
              <Pagination meta={list.data.meta} onPage={(p) => setUrl({ page: String(p) })} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
