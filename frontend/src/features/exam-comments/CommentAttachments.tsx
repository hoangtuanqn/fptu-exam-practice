import { useEffect, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { formatBytes } from "@/shared/utils/formatters";
import type { CommentAttachment } from "./exam-comments.api";

export const MAX_FILES = 4;
const MB = 1024 * 1024;

// Ảnh và tệp được nhận: đuôi tệp (kiểu MIME của zip / txt khác nhau giữa các trình duyệt nên xét theo đuôi)
export const KINDS = {
  image: { accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp", ext: /\.(jpe?g|png|webp)$/i, maxMb: 5, wrongType: "Chỉ nhận ảnh JPG, PNG hoặc WEBP", tooBig: "Ảnh" },
  file: { accept: ".pdf,.zip,.txt", ext: /\.(pdf|zip|txt)$/i, maxMb: 10, wrongType: "Chỉ nhận tệp PDF, ZIP hoặc TXT", tooBig: "Tệp" },
} as const;
export type FileKind = keyof typeof KINDS;

// Thêm tệp vừa chọn vào danh sách: bỏ tệp sai loại / quá lớn / vượt số lượng, trả kèm lỗi đầu tiên để báo
export function addFiles(current: File[], picked: File[], kind: FileKind): { files: File[]; error: string | null } {
  const k = KINDS[kind];
  const files = [...current];
  let error: string | null = null;
  for (const f of picked) {
    const problem = !k.ext.test(f.name)
      ? k.wrongType
      : f.size > k.maxMb * MB
        ? `${k.tooBig} “${f.name}” lớn hơn ${k.maxMb} MB`
        : files.length >= MAX_FILES
          ? `Mỗi bình luận đính kèm tối đa ${MAX_FILES} ảnh hoặc tệp`
          : null;
    if (problem) error ??= problem;
    else files.push(f);
  }
  return { files, error };
}

const isImageFile = (f: File) => KINDS.image.ext.test(f.name);

// Ảnh xem trước của tệp chưa gửi: tạo object URL khi hiện, thu hồi khi gỡ hoặc ô viết đóng
function LocalThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-m3-xs object-cover" /> : <span className="h-10 w-10 shrink-0" />;
}

// Tệp đã chọn trong ô viết: ảnh nhỏ hoặc tên + dung lượng, kèm nút gỡ
export function PendingFiles({ files, onRemove, disabled }: { files: File[]; onRemove: (f: File) => void; disabled?: boolean }) {
  if (files.length === 0) return null;
  return (
    <div className="px-3 pt-2">
      <ul className="flex flex-wrap gap-2" aria-label="Ảnh và tệp đính kèm">
        {files.map((f, i) => (
          <li key={`${i}:${f.name}`} className="flex max-w-full items-center gap-2 rounded-m3-sm border border-outline-variant bg-surface-container-low py-1 pl-1 pr-0.5 sm:max-w-64">
            {isImageFile(f) ? <LocalThumb file={f} /> : <FileText size={18} className="mx-1 shrink-0 text-on-surface-variant" aria-hidden />}
            <span className="min-w-0 flex-1">
              <span className="md-body-small block truncate text-on-surface" title={f.name}>
                {f.name}
              </span>
              <span className="md-body-small block text-on-surface-variant">{formatBytes(f.size)}</span>
            </span>
            <button type="button" onClick={() => onRemove(f)} disabled={disabled} aria-label={`Gỡ ${f.name}`} className="md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant">
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      <p className="md-body-small mt-1.5 text-on-surface-variant">Bình luận có ảnh hoặc tệp sẽ hiện sau khi được duyệt</p>
    </div>
  );
}

// Ảnh / tệp của một bình luận đã gửi: ảnh thành lưới nhỏ (bấm mở tab mới), tệp khác thành hàng gọn để tải
export function CommentFiles({ items, className = "" }: { items?: CommentAttachment[]; className?: string }) {
  if (!items?.length) return null;
  const images = items.filter((a) => a.isImage);
  const others = items.filter((a) => !a.isImage);
  return (
    <div className={`space-y-2 ${className}`}>
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((a) => (
            <li key={a.id}>
              <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`Mở ảnh ${a.name}`} title={a.name} className="block h-24 w-24 overflow-hidden rounded-m3-sm bg-surface-container-high ring-1 ring-outline-variant outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <img src={a.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className="space-y-1">
          {others.map((a) => (
            <li key={a.id}>
              <a href={a.url} download={a.name} rel="noopener noreferrer" className="md-state inline-flex min-h-10 max-w-full items-center gap-2 rounded-m3-sm border border-outline-variant px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <FileText size={16} className="shrink-0 text-on-surface-variant" aria-hidden />
                <span className="md-body-medium min-w-0 truncate text-on-surface">{a.name}</span>
                <span className="md-body-small shrink-0 text-on-surface-variant">{formatBytes(a.sizeBytes)}</span>
                <Download size={16} className="shrink-0 text-on-surface-variant" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
