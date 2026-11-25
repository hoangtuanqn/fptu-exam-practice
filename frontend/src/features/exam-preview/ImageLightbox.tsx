import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Maximize, Pause, Play, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useImageZoom } from "@/features/practice/hooks/useImageZoom";
import { downloadProtectedImage, openProtectedImage } from "@/shared/api/protectedImage";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";

export interface LightboxItem {
  src: string;
  name: string;
}

// Xem ảnh các trang trong lớp phủ: đếm trang, thu/phóng, xoay, tự chạy, toàn màn hình, tải, mở tab mới, mũi tên và dải ảnh nhỏ bên dưới.
// Thu/phóng dùng chung logic với cửa sổ xem ảnh khi luyện đề: bấm vào ảnh để phóng quanh điểm bấm, đã phóng thì kéo chuột (bàn tay) để di chuyển.
const BTN = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent";
const SLIDE_MS = 3000;

export function ImageLightbox({ items, index, onIndex, onClose }: { items: LightboxItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const z = useImageZoom({ topAlign: true });
  const [turns, setTurns] = useState(0); // số lần xoay 90° theo chiều kim đồng hồ
  const [playing, setPlaying] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const item = items[index]!;
  const last = items.length - 1;

  const go = useCallback((i: number) => onIndex(Math.min(last, Math.max(0, i))), [onIndex, last]);

  // Sang ảnh khác thì về cỡ vừa khung, không xoay
  useEffect(() => {
    z.reset();
    setTurns(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "ArrowRight") go(index + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, go, index]);

  // Tự chạy: hết ảnh cuối thì dừng
  useEffect(() => {
    if (!playing) return;
    if (index >= last) return setPlaying(false);
    const t = setTimeout(() => go(index + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, index, last, go]);

  // Giữ ảnh đang xem trong tầm nhìn của dải ảnh nhỏ
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={item.name} className="md-scrim-in fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium tabular-nums">
          {index + 1} / {items.length}
        </span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={z.zoomOut} disabled={!z.canZoomOut} aria-label="Thu nhỏ" className={BTN}>
            <ZoomOut size={20} />
          </button>
          <button type="button" onClick={z.reset} title="Về cỡ vừa khung" className="w-14 text-center text-sm font-medium tabular-nums">
            {Math.round(z.zoom * 100)}%
          </button>
          <button type="button" onClick={z.zoomIn} disabled={!z.canZoomIn} aria-label="Phóng to" className={BTN}>
            <ZoomIn size={20} />
          </button>
          <button type="button" onClick={() => setTurns((t) => t + 1)} aria-label="Xoay ảnh" className={BTN}>
            <RotateCw size={20} />
          </button>
          <span className="mx-1 h-6 w-px bg-white/20" />
          <button type="button" onClick={() => setPlaying((p) => !p)} disabled={items.length < 2} aria-label={playing ? "Dừng tự chạy" : "Tự chạy"} className={BTN}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button type="button" onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)} aria-label="Toàn màn hình" className={BTN}>
            <Maximize size={20} />
          </button>
          <button type="button" onClick={() => void downloadProtectedImage(item.src, item.name).catch(() => undefined)} aria-label="Tải về" className={BTN}>
            <Download size={20} />
          </button>
          <button type="button" onClick={() => void openProtectedImage(item.src)} aria-label="Mở tab mới" className={BTN}>
            <ExternalLink size={20} />
          </button>
          <span className="mx-1 h-6 w-px bg-white/20" />
          <button type="button" onClick={onClose} aria-label="Đóng" className={BTN}>
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={z.scrollRef}
          onScroll={z.onScroll}
          {...z.dragProps}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          className={`h-full overflow-auto p-4 ${z.canPan ? (z.grabbing ? "cursor-grabbing select-none" : "cursor-grab") : ""}`}
        >
          {/* Rộng đúng bằng khung xem (100% = vừa chiều ngang), nằm giữa theo chiều ngang và bắt đầu từ ĐẦU ảnh */}
          <div className="flex min-h-full min-w-full">
            <div className="relative mx-auto shrink-0" style={{ width: `${z.zoom * 100}%`, maxWidth: "none" }}>
              <ProtectedImg
                ref={z.imgRef}
                src={item.src}
                alt={item.name}
                onLoad={z.onImageLoad}
                title="Lăn chuột để phóng/thu, kéo để di chuyển ảnh"
                className="block w-full cursor-[inherit] select-none bg-white"
                style={{ transform: `rotate(${turns * 90}deg)` }}
              />
            </div>
          </div>
        </div>
        {index > 0 && (
          <button type="button" onClick={() => go(index - 1)} aria-label="Ảnh trước" className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 hover:bg-white/20">
            <ChevronLeft size={24} />
          </button>
        )}
        {index < last && (
          <button type="button" onClick={() => go(index + 1)} aria-label="Ảnh sau" className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 hover:bg-white/20">
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div ref={strip} className="flex gap-2 overflow-x-auto px-3 py-3">
          {items.map((it, i) => (
            <button
              key={it.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Xem ${it.name}`}
              aria-current={i === index}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-white outline-none ${i === index ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"}`}
            >
              <ProtectedImg src={it.src} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
