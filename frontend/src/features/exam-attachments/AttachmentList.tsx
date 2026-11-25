import { useState } from "react";
import { Download, ExternalLink, Eye, File, FileArchive, FileText, Film, Music, type LucideIcon } from "lucide-react";
import type { ExamAttachment } from "@/features/exam/types";
import { ImageLightbox } from "@/features/exam-preview/ImageLightbox";
import { buttonClass } from "@/shared/ui/Button";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { formatBytes } from "@/shared/utils/formatters";

export const ICONS: Record<ExamAttachment["kind"], LucideIcon> = {
  pdf: FileText,
  text: FileText,
  archive: FileArchive,
  video: Film,
  audio: Music,
  other: File,
};

// Máy chủ chỉ mở thẳng trên trình duyệt các loại này; zip, rar... luôn là tải về
export const OPENABLE = new Set<ExamAttachment["kind"]>(["pdf", "text", "video", "audio"]);

// Tệp đính kèm là ảnh (đuôi ảnh thường gặp; SVG không tính vì có thể chứa script). Máy chủ không phát tệp này inline,
// nên ảnh được tải có danh tính rồi hiện bằng blob (ProtectedImg) và xem lớn bằng ImageLightbox, giống ảnh trang đề.
export const isImageFile = (a: ExamAttachment) => /\.(webp|png|jpe?g|gif)$/i.test(a.name);

export const downloadUrl = (url: string) => `${url}${url.includes("?") ? "&" : "?"}download=1`;

// Danh sách tệp đính kèm của đề: mỗi dòng là biểu tượng theo loại, tên, dung lượng, nút Mở (nếu xem được) và Tải về
export function AttachmentList({ attachments }: { attachments: ExamAttachment[] }) {
  const [viewing, setViewing] = useState<number | null>(null); // vị trí trong danh sách ảnh đang xem lớn
  const images = attachments.filter(isImageFile);
  const list = (
    <ul className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      {attachments.map((a) => {
        const Icon = ICONS[a.kind] ?? File;
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
            {isImageFile(a) ? (
              <ProtectedImg src={a.url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md bg-white object-cover object-top ring-1 ring-outline-variant/50" />
            ) : (
              <Icon size={20} className="shrink-0 text-on-surface-variant" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <div className="md-body-medium truncate text-on-surface" title={a.name}>
                {a.name}
              </div>
              <div className="md-body-small text-on-surface-variant">{formatBytes(a.sizeBytes)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isImageFile(a) && (
                <button type="button" onClick={() => setViewing(images.indexOf(a))} aria-label={`Xem ${a.name}`} className={buttonClass({ size: "sm", variant: "text" })}>
                  <Eye size={15} /> Xem
                </button>
              )}
              {OPENABLE.has(a.kind) && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`Mở ${a.name}`} className={buttonClass({ size: "sm", variant: "text" })}>
                  <ExternalLink size={15} /> Mở
                </a>
              )}
              <a href={downloadUrl(a.url)} download={a.name} aria-label={`Tải về ${a.name}`} className={buttonClass({ size: "sm", variant: "tonal" })}>
                <Download size={15} /> Tải về
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      {list}
      {viewing !== null && viewing >= 0 && <ImageLightbox items={images.map((a) => ({ src: a.url, name: a.name }))} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />}
    </>
  );
}
