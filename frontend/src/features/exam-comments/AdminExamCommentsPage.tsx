import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, MessagesSquare, Trash2, X } from "lucide-react";
import { refreshReviewCounts } from "@/features/admin/review-counts.store";
import { openImageHandler } from "@/shared/api/protectedImage";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button, IconButton } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { ConfirmModal, useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { SearchBox } from "@/shared/ui/SearchBox";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import { adminCommentApi, type AdminCommentFilter, type AdminExamComment, type CommentStatus, type FlagReason } from "./exam-comments.api";

const FILTERS: { value: AdminCommentFilter; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "REPORTED", label: "Bị báo cáo" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "all", label: "Tất cả" },
];

const STATUS: Record<CommentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Chờ duyệt", tone: "warning" },
  APPROVED: { label: "Đã duyệt", tone: "success" },
  REJECTED: { label: "Từ chối", tone: "danger" },
};

const FLAG: Record<FlagReason, string> = {
  WORDS: "Từ ngữ không phù hợp",
  LINK: "Có đường link",
  CONTACT: "Có thông tin liên hệ",
  REPEATED: "Lặp ký tự",
  SPAM: "Gửi lặp ở nhiều câu",
  STRIKES: "Người gửi hay bị từ chối",
  REPORTED: "Bị báo cáo",
};

type Decision = "APPROVED" | "REJECTED";

// Kiểm duyệt bình luận theo câu của đề: mặc định hiện bình luận chờ duyệt; thông báo admin trỏ tới đây (kể cả ?status=REPORTED)
export default function AdminExamCommentsPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ status: "PENDING", page: "1", q: "" });
  const [search, setSearch, q, searchPending] = useUrlSearch(url.q, setUrl);
  const status = (FILTERS.some((f) => f.value === url.status) ? url.status : "PENDING") as AdminCommentFilter;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => adminCommentApi.list(status, q, page), [page, status, q]);
  useClampPage(data?.meta, setPage);
  const items = data?.items ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<AdminExamComment | null>(null);
  const [note, setNote] = useState("");
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => setSelected(new Set()), [data]); // chọn chỉ trong trang đang xem

  const act = async (job: () => Promise<unknown>, done: string, fallback: string) => {
    setBusy(true);
    try {
      await job();
      toast.success(done);
      reload();
      void refreshReviewCounts();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const review = (c: AdminExamComment, decision: Decision, reviewNote?: string) =>
    act(() => adminCommentApi.review(c.id, decision, reviewNote), decision === "APPROVED" ? "Đã duyệt bình luận" : "Đã từ chối bình luận", "Chưa cập nhật được bình luận");

  const bulk = (decision: Decision) =>
    act(() => adminCommentApi.bulk([...selected], decision), decision === "APPROVED" ? `Đã duyệt ${selected.size} bình luận` : `Đã từ chối ${selected.size} bình luận`, "Chưa cập nhật được các bình luận");

  const remove = async (c: AdminExamComment) => {
    if (!(await confirm({ title: "Xoá bình luận này?", message: "Bình luận bị xoá hẳn, không khôi phục được.", confirmLabel: "Xoá", tone: "danger" }))) return;
    await act(() => adminCommentApi.remove(c.id), "Đã xoá bình luận", "Chưa xoá được bình luận");
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  // Số âm = tệp đính kèm: hiện tên tệp thay cho số câu
  const targetOf = (c: AdminExamComment) => (c.questionNumber < 0 ? (c.targetName ?? "Tệp đính kèm") : `câu ${c.questionNumber}`);
  const allOn = items.length > 0 && items.every((c) => selected.has(c.id));

  return (
    <>
      {confirmDialog}
      <PageHeader title="Bình luận đề thi" description="Bình luận bị giữ lại hoặc bị báo cáo. Duyệt để hiện, từ chối để ẩn." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-outline-variant p-4">
          <SearchBox busy={searchPending || loading} value={search} onChange={setSearch} placeholder="Tìm theo nội dung, email hoặc tên đề" label="Tìm bình luận" />
          <Segmented<AdminCommentFilter> label="Lọc theo trạng thái" value={status} onChange={(v) => setUrl({ status: v, page: "1" })} options={FILTERS} />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant px-4 py-2">
              <label className="md-label-large flex min-h-10 items-center gap-2 text-on-surface">
                <input type="checkbox" className="h-4 w-4" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(items.map((c) => c.id)))} />
                Chọn cả trang
              </label>
              {selected.size > 0 && (
                <>
                  <span className="md-body-medium text-on-surface-variant">Đã chọn {selected.size}</span>
                  <Button size="sm" variant="filled" disabled={busy} onClick={() => void bulk("APPROVED")}>
                    <Check size={16} aria-hidden /> Duyệt
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => void bulk("REJECTED")}>
                    <X size={16} aria-hidden /> Từ chối
                  </Button>
                </>
              )}
            </div>
            <ul className="divide-y divide-outline-variant">
              {items.map((c) => (
                <li key={c.id} className="flex gap-3 p-4">
                  <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Chọn bình luận của ${c.author?.fullName ?? "người dùng"}`} />
                  {c.imageUrl && (
                    <a href={c.imageUrl} onClick={openImageHandler(c.imageUrl)} aria-label={`Xem ảnh ${targetOf(c)}`} className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-m3-sm bg-white ring-1 ring-outline-variant sm:block">
                      <ProtectedImg src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                    </a>
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                      {c.parentId && <Badge>Phản hồi</Badge>}
                      {c.flagReason && <Badge tone="warning">{FLAG[c.flagReason] ?? c.flagReason}</Badge>}
                      {c.reportCount > 0 && <Badge tone="danger">{c.reportCount} báo cáo</Badge>}
                    </div>
                    <p className="md-body-medium whitespace-pre-wrap break-words text-on-surface">{c.body}</p>
                    <div className="md-body-small text-on-surface-variant">
                      {c.author ? `${c.author.fullName} (${c.author.email})` : "Không rõ"} · {formatDateTime(c.createdAt)}
                    </div>
                    <div className="md-body-small break-words text-on-surface-variant">
                      <Link to={`/exam/${c.exam.id}/preview`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                        {c.exam.title}
                      </Link>{" "}
                      · {c.questionNumber < 0 && !c.imageUrl && <Badge>Tệp</Badge>} {targetOf(c)}
                      {c.imageUrl && (
                        <a href={c.imageUrl} onClick={openImageHandler(c.imageUrl)} className="ml-1 text-primary hover:underline sm:hidden">
                          · xem ảnh
                        </a>
                      )}
                    </div>
                    {c.reviewNote && <div className="md-body-small text-on-surface-variant">Ghi chú: {c.reviewNote}</div>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.status !== "APPROVED" || c.reportCount > 0 ? (
                        <Button size="sm" variant="tonal" disabled={busy} onClick={() => void review(c, "APPROVED")}>
                          <Check size={16} aria-hidden /> Duyệt
                        </Button>
                      ) : null}
                      {c.status !== "REJECTED" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setNote("");
                            setRejecting(c);
                          }}
                        >
                          <X size={16} aria-hidden /> Từ chối
                        </Button>
                      )}
                      <IconButton label="Xoá bình luận" disabled={busy} onClick={() => void remove(c)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={MessagesSquare} title={q ? "Không có bình luận nào khớp từ khoá" : status === "PENDING" ? "Không có bình luận nào chờ duyệt" : status === "REPORTED" ? "Không có bình luận nào bị báo cáo" : "Không có bình luận nào"} />
        )}
      </Card>

      {rejecting && (
        <ConfirmModal
          title="Từ chối bình luận này?"
          tone="danger"
          confirmLabel="Từ chối"
          busy={busy}
          message={
            <label className="block">
              <span className="md-label-large text-on-surface">Ghi chú (không bắt buộc)</span>
              <textarea value={note} maxLength={255} rows={3} onChange={(e) => setNote(e.target.value)} className="md-body-medium mt-1 w-full rounded-m3-sm border border-outline bg-transparent p-2 text-on-surface" />
            </label>
          }
          onCancel={() => setRejecting(null)}
          onConfirm={() => void review(rejecting, "REJECTED", note.trim() || undefined).then((ok) => ok && setRejecting(null))}
        />
      )}
    </>
  );
}
