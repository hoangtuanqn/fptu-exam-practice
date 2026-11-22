import { useEffect, useState } from "react";
import type { FolderItem } from "./folder";

// Lưới xem trước theo số câu: ảnh nhỏ, tải lười; link xem trước thu hồi khi đổi thư mục hoặc đóng
export function FolderPreview({ items, replaced }: { items: FolderItem<File>[]; replaced: number[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const made = items.map((i) => URL.createObjectURL(i.file));
    setUrls(made);
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, [items]);

  const answered = items.filter((i) => i.answer.length).length;
  return (
    <div>
      <p className="md-label-large mb-2 text-on-surface-variant" aria-live="polite">
        {items.length} ảnh · {answered} có đáp án{replaced.length ? ` · ${replaced.length} câu sẽ thay ảnh` : ""}
      </p>
      <ul className="grid max-h-[50vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 md:grid-cols-8">
        {items.map((it, i) => (
          <li key={it.number} className="min-w-0 overflow-hidden rounded-m3-sm border border-outline-variant bg-surface-container">
            <div className="relative">
              {urls[i] && <img src={urls[i]} alt={`Câu ${it.number}`} loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" />}
              <span className={`md-label-small absolute left-1 top-1 rounded px-1.5 ${replaced.includes(it.number) ? "bg-warning-container text-on-warning-container" : "bg-scrim/60 text-white"}`}>Q{it.number}</span>
            </div>
            <p className={`md-label-medium truncate px-1.5 py-1 text-center ${it.answer.length ? "text-on-surface" : "text-on-surface-variant"}`}>{it.answer.length ? it.answer.join(" ") : "—"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
