import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Download, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { buttonClass } from "@/shared/ui/Button";

const ENABLED_ITEM = '[role="menuitem"]:not(:disabled)';

// Nút "…" trên thanh công cụ: tải đề, xoá đề (ít dùng nên gom vào menu)
// onDownload bỏ trống (đề không có câu hỏi) thì ẩn mục tải đề
export function MoreMenu({ downloading, locked, onDownload, onDelete }: { downloading: boolean; locked: boolean; onDownload?: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const enabledItems = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>(ENABLED_ITEM) ?? [])];

  // Mở menu thì focus mục đầu tiên bấm được
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>(ENABLED_ITEM)?.focus();
  }, [open]);

  // Bấm ra ngoài menu thì đóng (không dựa vào blur: Safari không focus nút khi bấm chuột)
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = enabledItems();
      if (!items.length) return;
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
      items[next]!.focus();
    }
  }

  const item = "flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition hover:bg-surface-container-high disabled:opacity-50 disabled:hover:bg-transparent";
  return (
    <div
      ref={wrapRef}
      className="relative"
      onKeyDown={onKeyDown}
      // Tab sang phần tử khác ngoài menu thì đóng (relatedTarget rỗng = bấm chuột, đã có pointerdown lo)
      onBlur={(e) => open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Thao tác khác"
        title="Thao tác khác"
        onClick={() => setOpen((o) => !o)}
        className={buttonClass({ size: "sm" })}
      >
        {downloading ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
      </button>
      {open && (
        <>
          <div ref={menuRef} role="menu" className="absolute right-0 top-full z-20 mt-1 w-60 space-y-0.5 rounded-xl border border-outline-variant bg-surface p-1.5 shadow-lg">
            {onDownload && (
              <button type="button" role="menuitem" disabled={downloading} onClick={run(onDownload)} className={`${item} text-on-surface`}>
                <Download size={16} className="shrink-0 text-on-surface-variant" />
                <span>
                  Tải đề (.zip)
                  <span className="block text-xs text-on-surface-variant">Ảnh từng câu và file đáp án</span>
                </span>
              </button>
            )}
            <button type="button" role="menuitem" disabled={locked} title={locked ? "Chờ AI giải xong" : undefined} onClick={run(onDelete)} className={`${item} text-error`}>
              <Trash2 size={16} className="shrink-0" /> Xoá đề
            </button>
          </div>
        </>
      )}
    </div>
  );
}
