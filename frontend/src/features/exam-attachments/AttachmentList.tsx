import { Download, ExternalLink, File, FileArchive, FileText, Film, Music, type LucideIcon } from "lucide-react";
import type { ExamAttachment } from "@/features/exam-import/types";
import { buttonClass } from "@/shared/ui/Button";
import { formatBytes } from "@/shared/utils/formatters";

const ICONS: Record<ExamAttachment["kind"], LucideIcon> = {
  pdf: FileText,
  text: FileText,
  archive: FileArchive,
  video: Film,
  audio: Music,
  other: File,
};

// Máy chủ chỉ mở thẳng trên trình duyệt các loại này; zip, rar... luôn là tải về
const OPENABLE = new Set<ExamAttachment["kind"]>(["pdf", "text", "video", "audio"]);

const downloadUrl = (url: string) => `${url}${url.includes("?") ? "&" : "?"}download=1`;

// Danh sách tệp đính kèm của đề: mỗi dòng là biểu tượng theo loại, tên, dung lượng, nút Mở (nếu xem được) và Tải về
export function AttachmentList({ attachments }: { attachments: ExamAttachment[] }) {
  return (
    <ul className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      {attachments.map((a) => {
        const Icon = ICONS[a.kind] ?? File;
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
            <Icon size={20} className="shrink-0 text-on-surface-variant" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="md-body-medium truncate text-on-surface" title={a.name}>
                {a.name}
              </div>
              <div className="md-body-small text-on-surface-variant">{formatBytes(a.sizeBytes)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
}
