import { formatBytes } from "@/shared/utils/formatters";
import type { ResourceCheck } from "./folder";

// Thư mục tài liệu: các tệp sẽ tải lên (tên + dung lượng) và các tệp bị bỏ qua vì đuôi không nhận
export function ResourcePreview({ check }: { check: ResourceCheck<File> }) {
  const total = check.files.reduce((s, f) => s + f.file.size, 0);
  return (
    <div className="space-y-3">
      {check.files.length > 0 && (
        <div>
          <p className="md-label-large mb-2 text-on-surface-variant" aria-live="polite">
            {check.files.length} tệp sẽ tải lên · {formatBytes(total)}
          </p>
          <ul className="max-h-[40vh] divide-y divide-outline-variant overflow-y-auto rounded-m3-sm border border-outline-variant">
            {check.files.map((f) => (
              <li key={f.path} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="md-body-medium min-w-0 break-words text-on-surface">{f.path}</span>
                <span className="md-body-small shrink-0 text-on-surface-variant">{formatBytes(f.file.size)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {check.skipped.length > 0 && (
        <div>
          <p className="md-label-large mb-2 text-on-surface-variant">{check.skipped.length} tệp bị bỏ qua (loại tệp không nhận)</p>
          <ul className="md-body-small max-h-40 space-y-1 overflow-y-auto break-words rounded-m3-sm bg-surface-container px-3 py-2 text-on-surface-variant">
            {check.skipped.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
