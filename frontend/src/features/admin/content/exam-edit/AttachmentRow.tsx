import { useState } from "react";
import { Check, Download, File, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { ICONS, downloadUrl } from "@/features/exam-attachments/AttachmentList";
import type { ExamAttachment } from "@/features/exam/types";
import { IconButton } from "@/shared/ui/Button";
import { formatBytes } from "@/shared/utils/formatters";

interface Props {
  a: ExamAttachment;
  disabled: boolean;
  onRename: (name: string) => Promise<string | null>; // trả lỗi để hiện dưới ô sửa, null = đã lưu
  onReplace: () => void;
  onDelete: () => void;
}

// Một dòng tệp đính kèm trong trang sửa đề: tên (sửa tại chỗ), dung lượng, Tải về / Đổi tên / Thay thế / Xoá
export function AttachmentRow({ a, disabled, onRename, onReplace, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const Icon = ICONS[a.kind] ?? File;

  const cancel = () => {
    setEditing(null);
    setError(null);
  };
  async function save() {
    const name = editing?.trim() ?? "";
    if (!name || name === a.name) return cancel();
    const err = await onRename(name);
    if (err) setError(err);
    else cancel();
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <Icon size={20} className="shrink-0 text-on-surface-variant" aria-hidden />
      <div className="min-w-0 flex-1">
        {editing === null ? (
          <div className="md-body-medium truncate text-on-surface" title={a.name}>
            {a.name}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={editing}
                readOnly={disabled}
                aria-label={`Tên mới cho ${a.name}`}
                aria-invalid={!!error}
                onChange={(e) => {
                  setEditing(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void save();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancel();
                  }
                }}
                className="md-body-medium h-10 min-w-0 flex-1 rounded-lg border border-outline bg-surface px-2.5 text-on-surface focus:border-primary focus:outline-none"
              />
              <IconButton label="Lưu tên mới" disabled={disabled} onClick={() => void save()}>
                <Check size={18} />
              </IconButton>
              <IconButton label="Huỷ đổi tên" onClick={cancel}>
                <X size={18} />
              </IconButton>
            </div>
            {error && (
              <p role="alert" className="md-body-small mt-1 text-error">
                {error}
              </p>
            )}
          </>
        )}
        {editing === null && <div className="md-body-small text-on-surface-variant">{formatBytes(a.sizeBytes)}</div>}
        {editing !== null && !error && <div className="md-body-small text-on-surface-variant">Enter để lưu, Esc để huỷ</div>}
      </div>
      <div className="flex shrink-0 items-center">
        <a
          href={downloadUrl(a.url)}
          download={a.name}
          aria-label={`Tải về ${a.name}`}
          title="Tải về"
          className="md-state relative inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant"
        >
          <Download size={18} />
        </a>
        <IconButton label={`Đổi tên ${a.name}`} disabled={disabled} onClick={() => setEditing(a.name)}>
          <Pencil size={18} />
        </IconButton>
        <IconButton label={`Thay thế ${a.name}`} disabled={disabled} onClick={onReplace}>
          <RefreshCw size={18} />
        </IconButton>
        <IconButton label={`Xoá ${a.name}`} disabled={disabled} onClick={onDelete}>
          <Trash2 size={18} className={disabled ? undefined : "text-error"} />
        </IconButton>
      </div>
    </li>
  );
}
