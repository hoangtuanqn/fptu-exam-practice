import { Link } from "react-router-dom";
import { BookCheck, Crown, NotebookPen, PenLine, Play, Trash2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { Segmented } from "@/shared/ui/Segmented";
import { boxLabel, dueText, reviewApi, type ReviewRow } from "./review.api";
import { StudyStreakCard } from "./StudyStreakCard";
import { TopicReport } from "./TopicReport";

type Status = "active" | "mastered";

// Sổ câu sai: mọi câu từng làm sai (hoặc đánh dấu phân vân) tự vào đây và được nhắc ôn lại theo lịch 1, 3, 7, 14, 30 ngày
export default function ReviewPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ page: "1", status: "active" });
  const page = toPage(url.page);
  const status: Status = url.status === "mastered" ? "mastered" : "active";

  const summary = useApi(() => reviewApi.summary(), []);
  const list = useApi(() => reviewApi.list(page, status), [page, status]);
  useClampPage(list.data?.meta, (p) => setUrl({ page: String(p) }));

  const s = summary.data;
  const atLimit = !!s && s.limit !== null && s.total >= s.limit;

  const remove = (row: ReviewRow) =>
    reviewApi
      .remove(row.id)
      .then(() => {
        toast.success("Đã bỏ khỏi sổ");
        summary.reload();
        list.reload();
      })
      .catch((err: unknown) => toast.error(errorMessage(err, "Chưa bỏ được câu này")));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Học tập" title="Sổ câu sai" description="Câu làm sai tự vào đây và được nhắc ôn lại đúng lúc để nhớ lâu." />

      {summary.error && <ErrorBox message={summary.error} onRetry={summary.reload} />}

      {s && (
        <>
          <StatGrid className="grid-cols-3">
            <StatCard tone="rose" label="Cần ôn hôm nay" value={s.due} note={s.due > 0 ? "Ôn ngay để không quên" : "Hôm nay đã xong"} />
            <StatCard tone="amber" label="Đang trong sổ" value={s.limit ? `${s.total}/${s.limit}` : s.total} note={s.limit ? "Gói thường tối đa " + s.limit + " câu" : "Gói Pro: không giới hạn"} />
            <StatCard tone="emerald" label="Đã nhớ" value={s.mastered} note="Đúng đủ 5 lần ôn" />
          </StatGrid>

          <Card>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="md-title-medium text-on-surface">
                  {s.due > 0 ? `Có ${s.due} câu đến hạn ôn` : s.total > 0 ? "Hôm nay bạn đã ôn hết" : "Sổ câu sai đang trống"}
                </h2>
                <p className="md-body-medium mt-0.5 text-on-surface-variant">
                  {s.due > 0
                    ? "Mỗi lượt ôn tối đa 20 câu, mất khoảng vài phút."
                    : s.total > 0
                      ? s.nextDueAt
                        ? `Lần ôn kế tiếp: ${dueText(s.nextDueAt).toLowerCase()}. Bạn vẫn có thể ôn thêm ngay.`
                        : "Bạn vẫn có thể ôn thêm ngay."
                      : "Làm một đề rồi nộp bài, câu sai sẽ tự vào đây."}
                </p>
              </div>
              {s.due > 0 ? (
                <Link to="/account/review/practice" className={buttonClass({ variant: "primary" })}>
                  <Play size={16} /> Ôn ngay ({Math.min(s.due, 20)} câu)
                </Link>
              ) : s.total > 0 ? (
                <Link to="/account/review/practice?all=1" className={buttonClass({ variant: "primary" })}>
                  <Play size={16} /> Ôn thêm
                </Link>
              ) : (
                <Link to="/" className={buttonClass({ variant: "primary" })}>
                  <PenLine size={16} /> Vào luyện đề
                </Link>
              )}
            </div>
            {atLimit && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-5 py-3">
                <p className="md-body-medium text-on-surface">
                  Sổ đã đầy {s.limit} câu nên các câu sai mới chưa được lưu. Ôn xong vài câu để có chỗ, hoặc nâng cấp Pro để không bị giới hạn.
                </p>
                <Link to="/pro" className={buttonClass({ size: "sm" })}>
                  <Crown size={15} className="text-[#f0a800]" /> Xem gói Pro
                </Link>
              </div>
            )}
          </Card>
        </>
      )}

      <StudyStreakCard />

      <TopicReport />

      <Card>
        <CardHeader
          title="Danh sách câu"
          action={
            <Segmented
              label="Lọc câu trong sổ"
              value={status}
              options={[
                { value: "active", label: "Đang ôn" },
                { value: "mastered", label: "Đã nhớ" },
              ]}
              onChange={(v) => setUrl({ status: v, page: "1" })}
            />
          }
        />
        {list.loading && !list.data ? (
          <Loading />
        ) : list.error ? (
          <ErrorBox message={list.error} onRetry={list.reload} />
        ) : !list.data || list.data.items.length === 0 ? (
          <Empty icon={status === "active" ? NotebookPen : BookCheck} title={status === "active" ? "Chưa có câu nào cần ôn" : "Chưa có câu nào đã nhớ"}>
            {status === "active" ? "Nộp bài ở một đề, những câu làm sai hoặc bạn đánh dấu phân vân sẽ được thêm vào đây." : "Câu nào bạn ôn đúng đủ 5 lần sẽ được chuyển sang đây."}
          </Empty>
        ) : (
          <>
            <ul className="divide-y divide-outline-variant">
              {list.data.items.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-4">
                  {r.imageUrl ? (
                    <a href={r.imageUrl} target="_blank" rel="noreferrer" className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-m3-sm border border-outline-variant bg-surface-container-lowest sm:block">
                      <img src={r.imageUrl} alt={`Câu ${r.number}`} loading="lazy" className="h-full w-full object-cover object-top" />
                    </a>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="md-title-small truncate text-on-surface">
                      Câu {r.number} · {r.examTitle}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {r.mastered ? <Badge tone="success">Đã nhớ</Badge> : <Badge tone={r.due ? "danger" : "info"}>{boxLabel(r.box)}</Badge>}
                      {!r.mastered && <span className="md-body-small text-on-surface-variant">{dueText(r.nextReviewAt)}</span>}
                      {r.wrongCount > 0 && <span className="md-body-small text-on-surface-variant">· sai {r.wrongCount} lần</span>}
                      {r.doubtful && <Badge tone="warning">Từng phân vân</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link to={`/exam/${r.threadId}`} className={buttonClass({ size: "sm", variant: "text" })}>
                      Mở đề
                    </Link>
                    <Button size="sm" variant="text" onClick={() => void remove(r)} aria-label={`Bỏ câu ${r.number} khỏi sổ`} title="Bỏ khỏi sổ (mình nhớ rồi)">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination meta={list.data.meta} onPage={(p) => setUrl({ page: String(p) })} />
          </>
        )}
      </Card>
    </div>
  );
}
