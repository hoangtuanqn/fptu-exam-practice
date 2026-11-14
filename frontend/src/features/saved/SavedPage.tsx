import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkX, ExternalLink, Tag, X } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty } from "@/shared/ui/Feedback";
import { Select } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { savedApi, type SavedQuestion } from "./saved.api";

function SavedCard({ q, onZoom, onRemove }: { q: SavedQuestion; onZoom: (q: SavedQuestion) => void; onRemove: (q: SavedQuestion) => void }) {
  const correct = q.correct ?? [];
  return (
    <li>
      <Card className="flex h-full flex-col overflow-hidden">
        {q.imageUrl && (
          <button type="button" onClick={() => onZoom(q)} title="Bấm để xem ảnh lớn" aria-label={`Xem ảnh lớn câu ${q.number}`} className="block w-full border-b border-outline-variant bg-surface-container-lowest">
            <img src={q.imageUrl} alt={`Câu ${q.number}`} loading="lazy" className="h-48 w-full object-cover object-top" />
          </button>
        )}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="md-body-small line-clamp-2 break-words text-on-surface-variant">{q.examTitle}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="md-title-medium text-on-surface">Câu {q.number}</span>
            {q.topic && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-900" title={`Chủ đề: ${q.topic}`}>
                <Tag size={12} className="shrink-0 text-brand-700" />
                <span className="truncate font-medium">{q.topic}</span>
              </span>
            )}
          </div>
          {correct.length > 0 && <p className="md-body-medium text-on-surface">Đáp án: <b>{correct.join(" ")}</b></p>}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <Link to={`/exam/${q.threadId}/view?q=${q.number}`} className={buttonClass({ size: "sm" })}>
              <ExternalLink size={15} /> Mở đề
            </Link>
            <Button size="sm" variant="text" onClick={() => onRemove(q)}>
              <BookmarkX size={15} /> Bỏ lưu
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}

// Câu đã lưu: kho cá nhân để xem lại ảnh đề, đáp án và mở lại đề (không chấm điểm, không lịch ôn)
export default function SavedPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [url, setUrl] = useUrlState({ page: "1", subject: "" });
  const page = toPage(url.page);
  const list = useApi(() => savedApi.list(page, url.subject), [page, url.subject]);
  useClampPage(list.data?.meta, (p) => setUrl({ page: String(p) }));
  const [zoom, setZoom] = useState<SavedQuestion | null>(null);

  // shortcut: chỉ lấy môn có trong trang đang xem (cộng môn đang lọc), đủ cho kho nhỏ; cần đủ môn thì thêm API riêng
  const subjects = [...new Set([...(list.data?.items ?? []).map((q) => q.subjectCode), url.subject || null].filter((s): s is string => !!s))].sort();

  const remove = async (q: SavedQuestion) => {
    if (!(await confirm({ title: `Bỏ lưu câu ${q.number}?`, message: "Câu sẽ không còn trong danh sách này. Bạn có thể lưu lại bất cứ lúc nào khi mở đề.", confirmLabel: "Bỏ lưu", tone: "danger" }))) return;
    await savedApi
      .remove(q.examId, q.number)
      .then(() => {
        toast.success(`Đã bỏ lưu câu ${q.number}`);
        list.reload();
      })
      .catch((err: unknown) => toast.error(errorMessage(err, "Chưa bỏ lưu được câu này")));
  };

  return (
    <div className="space-y-5">
      {confirmDialog}
      <PageHeader title="Câu đã lưu" description="Những câu bạn đã lưu để xem lại đề và đáp án." />

      {subjects.length > 0 && (
        <div className="max-w-xs">
          <Select label="Môn" value={url.subject} onChange={(e) => setUrl({ subject: e.target.value, page: "1" })}>
            <option value="">Tất cả môn</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      )}

      <QueryBoundary query={list}>
        {(d) =>
          d.items.length === 0 ? (
            <Card>
              <Empty icon={Bookmark} title="Chưa có câu nào">
                Mở menu … ở câu hỏi và chọn Lưu câu này.
              </Empty>
            </Card>
          ) : (
            <div className="space-y-3">
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {d.items.map((q) => (
                  <SavedCard key={q.id} q={q} onZoom={setZoom} onRemove={(row) => void remove(row)} />
                ))}
              </ul>
              {d.meta && (
                <Card>
                  <Pagination meta={d.meta} onPage={(p) => setUrl({ page: String(p) })} />
                </Card>
              )}
            </div>
          )
        }
      </QueryBoundary>

      {zoom?.imageUrl && (
        <Modal wide onClose={() => setZoom(null)}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="md-title-large text-on-surface">Câu {zoom.number}</h2>
            <Button size="sm" variant="text" onClick={() => setZoom(null)} aria-label="Đóng">
              <X size={18} />
            </Button>
          </div>
          <img src={zoom.imageUrl} alt={`Câu ${zoom.number}`} className="h-auto w-full rounded-m3-sm" />
        </Modal>
      )}
    </div>
  );
}
