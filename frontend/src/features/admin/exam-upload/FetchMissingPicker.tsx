import { useState } from "react";
import { DownloadCloud, Search } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { ErrorBox, Spinner } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { Pagination } from "@/shared/ui/Table";
import { formatDate } from "@/shared/utils/formatters";
import { examUploadApi, KIND_LABEL, type ExamKind } from "./exam-upload.api";

interface Props {
  filters: { kind?: string; subject?: string };
  busy: boolean;
  onClose: () => void;
  onStart: (threadIds: string[] | undefined) => void; // undefined = mọi đề còn thiếu theo bộ lọc của trang
}

// Popup "Lấy tất cả đề chưa có": liệt kê các đề còn thiếu (cùng danh sách tab "Chưa có đề"), tick đề nào thì lấy đề đó
export function FetchMissingPicker({ filters, busy, onClose, onStart }: Props) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const list = useApi(
    () => examUploadApi.gaps({ gap: "no_exam", kind: (filters.kind ?? "") as ExamKind | "", subject: filters.subject ?? "", q, page }),
    [q, page, filters.kind, filters.subject],
  );
  const items = list.data?.items ?? [];

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal onClose={onClose} wide>
      <ModalTitle icon={DownloadCloud}>Lấy tất cả đề chưa có</ModalTitle>
      <ul className="md-body-medium mt-3 list-disc space-y-1 pl-5 text-on-surface-variant">
        <li>Chỉ tải ảnh của đề (và tệp đính kèm), không gọi AI nên đề chưa có đáp án.</li>
        <li>Chỉ lấy các đề đăng từ năm 2024 trở đi.</li>
        <li>Chạy nền từng đề một, chậm để không bị FuOverflow chặn. Có thể đóng trang, việc lấy đề vẫn tiếp tục.</li>
      </ul>

      <div className="relative mt-4">
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên đề"
          aria-label="Tìm theo tên đề"
          className={`${inputClass()} pl-9`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="md-label-large text-on-surface">Đã chọn {picked.size} đề</span>
        <div className="flex gap-1">
          <Button size="sm" variant="text" onClick={() => setPicked(new Set([...picked, ...items.map((g) => g.threadId)]))} disabled={items.length === 0}>
            Chọn trang này
          </Button>
          <Button size="sm" variant="text" onClick={() => setPicked(new Set())} disabled={picked.size === 0}>
            Bỏ chọn
          </Button>
        </div>
      </div>

      <div className="mt-2 max-h-80 overflow-y-auto rounded-m3-sm border border-outline-variant">
        {list.loading && !list.data ? (
          <div className="p-4">
            <Spinner size={20} />
          </div>
        ) : list.error ? (
          <div className="p-3">
            <ErrorBox message={list.error} onRetry={list.reload} />
          </div>
        ) : items.length === 0 ? (
          <p className="md-body-medium p-4 text-on-surface-variant">Không còn đề nào chưa có.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {items.map((g) => (
              <li key={g.threadId}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-container-high">
                  <input type="checkbox" checked={picked.has(g.threadId)} onChange={() => toggle(g.threadId)} className="h-4 w-4 accent-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-on-surface">{g.title}</span>
                    <span className="md-body-small text-on-surface-variant">
                      {[g.subjectCode, g.kind ? KIND_LABEL[g.kind] : null, g.postedAt ? formatDate(g.postedAt) : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}

      <ModalActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button onClick={() => onStart(undefined)} disabled={busy}>
          Lấy mọi đề theo bộ lọc
        </Button>
        <Button variant="primary" disabled={picked.size === 0 || busy} onClick={() => onStart([...picked])}>
          Lấy {picked.size} đề đã chọn
        </Button>
      </ModalActions>
    </Modal>
  );
}
