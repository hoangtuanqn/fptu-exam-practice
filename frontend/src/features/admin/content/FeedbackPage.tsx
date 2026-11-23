import { useEffect, useState } from "react";
import { openImageHandler } from "@/shared/api/protectedImage";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { CheckCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { adminApi, type ExplanationFeedbackAdmin, type ResolvedFilter } from "@/features/admin/api/admin.api";
import { refreshReviewCounts } from "@/features/admin/review-counts.store";
import { ResolvedBadge } from "@/features/admin/shared";
import { FEEDBACK_REASONS } from "@/features/explanation/explanation.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Markdown } from "@/shared/ui/Markdown";
import { useApi } from "@/shared/hooks/useApi";
import { SearchBox } from "@/shared/ui/SearchBox";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";

// down = chưa tốt và chưa giải quyết; resolved = chưa tốt đã giải quyết
type Filter = "up" | "down" | "resolved" | "";

const QUERY: Record<Filter, ["up" | "down" | "", ResolvedFilter]> = {
  down: ["down", "false"],
  resolved: ["down", "true"],
  up: ["up", ""],
  "": ["", ""],
};

const reasonLabel = (v: string | null) => FEEDBACK_REASONS.find((r) => r.value === v)?.label ?? null;

// Đánh giá 👍/👎 của người dùng về lời giải AI: mặc định hiện các đánh giá chưa tốt, kèm lời giải để đọc ngay và sửa prompt
export default function FeedbackPage() {
  const [url, setUrl] = useUrlState({ helpful: "down", page: "1", q: "" });
  const [search, setSearch, q] = useUrlSearch(url.q, setUrl);
  const toast = useToast();
  const filter = (Object.prototype.hasOwnProperty.call(QUERY, url.helpful) ? url.helpful : "down") as Filter;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => adminApi.explanationFeedback(page, ...QUERY[filter], q), [page, filter, q]);
  // Dòng vừa giải quyết hiện ngay kết quả server trả về; tải lại danh sách thì bỏ
  const [patched, setPatched] = useState<Record<string, ExplanationFeedbackAdmin>>({});
  useEffect(() => setPatched({}), [data]);
  const [saving, setSaving] = useState<string | null>(null);
  const items = data?.items.map((r) => patched[r.id] ?? r) ?? [];

  const resolve = async (id: string) => {
    setSaving(id);
    try {
      const row = await adminApi.resolveFeedback(id);
      setPatched((p) => ({ ...p, [id]: row }));
      toast.success("Đã đánh dấu đã giải quyết");
      void refreshReviewCounts();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };
  const summary = useApi(() => adminApi.explanationFeedbackSummary(), []);
  useClampPage(data?.meta, setPage);
  const [open, setOpen] = useState<string | null>(null);
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
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm theo tên đề, email hoặc nhận xét" label="Tìm đánh giá" />
          <Segmented<Filter>
            label="Lọc theo đánh giá"
            value={filter}
            onChange={(v) => setUrl({ helpful: v, page: "1" })}
            options={[
              { value: "down", label: "Chưa xử lý" },
              { value: "resolved", label: "Đã giải quyết" },
              { value: "up", label: "Hữu ích" },
              { value: "", label: "Tất cả" },
            ]}
          />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100">
              {items.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} className="flex min-w-0 flex-1 items-start gap-3 text-left">
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
                        {r.resolvedAt && (
                          <span className="mt-1 block">
                            <ResolvedBadge at={r.resolvedAt} />
                          </span>
                        )}
                      </span>
                    </button>
                    {!r.helpful && !r.resolvedAt && (
                      <Button
                        size="sm"
                        onClick={() => void resolve(r.id)}
                        disabled={saving !== null}
                        aria-label={`Giải quyết đánh giá câu ${r.questionNumber}, ${r.exam.title}`}
                        className="shrink-0"
                      >
                        <CheckCheck size={16} aria-hidden /> Giải quyết
                      </Button>
                    )}
                  </div>
                  {open === r.id && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      {/* Ảnh câu hỏi trên đầu để đối chiếu lời giải với đề; bấm để mở ảnh lớn ở tab mới */}
                      {r.imageUrl && (
                        <a href="#" onClick={openImageHandler(r.imageUrl)} title="Mở ảnh lớn" className="mb-3 block overflow-hidden rounded-lg border border-slate-200 bg-surface-container-lowest">
                          <ProtectedImg src={r.imageUrl} alt={`Câu ${r.questionNumber}`} loading="lazy" className="max-h-96 w-full object-contain" />
                        </a>
                      )}
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
          <Empty icon={ThumbsDown} title={q ? "Không có đánh giá nào khớp từ khoá" : filter === "down" ? "Không có đánh giá chưa tốt nào cần xử lý" : "Chưa có đánh giá nào"} />
        )}
      </Card>
    </>
  );
}
