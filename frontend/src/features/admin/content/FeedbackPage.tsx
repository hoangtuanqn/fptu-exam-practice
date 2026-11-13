import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { FEEDBACK_REASONS } from "@/features/explanation/explanation.api";
import { Markdown } from "@/shared/ui/Markdown";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";

type Filter = "up" | "down" | "";

const reasonLabel = (v: string | null) => FEEDBACK_REASONS.find((r) => r.value === v)?.label ?? null;

// Đánh giá 👍/👎 của người dùng về lời giải AI: mặc định hiện các đánh giá chưa tốt, kèm lời giải để đọc ngay và sửa prompt
export default function FeedbackPage() {
  const [url, setUrl] = useUrlState({ helpful: "down", page: "1" });
  const filter = url.helpful as Filter;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => adminApi.explanationFeedback(page, filter), [page, filter]);
  const summary = useApi(() => adminApi.explanationFeedbackSummary(), []);
  useClampPage(data?.meta, setPage);
  const [open, setOpen] = useState<number | null>(null);
  const total = (summary.data?.up ?? 0) + (summary.data?.down ?? 0);

  return (
    <>
      <PageHeader title="Đánh giá lời giải AI" description="Người dùng bấm hữu ích hoặc chưa tốt dưới mỗi lời giải. Đọc các đánh giá chưa tốt để biết prompt cần sửa ở đâu." />
      {summary.data && (
        <p className="mb-3 text-sm text-slate-600">
          Tổng {total} đánh giá: <b className="text-emerald-700">{summary.data.up} hữu ích</b> · <b className="text-rose-700">{summary.data.down} chưa tốt</b>
          {total > 0 && <> ({Math.round((summary.data.up / total) * 100)}% hữu ích)</>}
        </p>
      )}
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented<Filter>
            label="Lọc theo đánh giá"
            value={filter}
            onChange={(v) => setUrl({ helpful: v, page: "1" })}
            options={[
              { value: "down", label: "Chưa tốt" },
              { value: "up", label: "Hữu ích" },
              { value: "", label: "Tất cả" },
            ]}
          />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100">
              {data.items.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} className="flex w-full items-start gap-3 text-left">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${r.helpful ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {r.helpful ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {r.exam.title} · câu {r.questionNumber}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {r.user.fullName} · {formatDateTime(r.updatedAt)}
                        {reasonLabel(r.reason) && <> · {reasonLabel(r.reason)}</>}
                      </span>
                      {r.comment && <span className="mt-1 block text-sm text-slate-700">“{r.comment}”</span>}
                    </span>
                  </button>
                  {open === r.id && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <div className="mb-2 text-xs text-slate-500">Lời giải đang lưu{r.model ? ` (${r.model})` : ""}:</div>
                      {r.explanation ? <Markdown>{r.explanation}</Markdown> : <p className="text-sm text-slate-500">Lời giải này đã bị xóa.</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={ThumbsDown} title={filter === "down" ? "Chưa có đánh giá chưa tốt nào" : "Chưa có đánh giá nào"} />
        )}
      </Card>
    </>
  );
}
