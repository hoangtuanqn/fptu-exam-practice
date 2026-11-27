import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Maximize, MessageSquare, Pause, Play, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { DiscussionPanel } from "@/features/exam-comments/DiscussionPanel";
import { useImageZoom } from "@/features/practice/hooks/useImageZoom";
import { downloadProtectedImage, openProtectedImage } from "@/shared/api/protectedImage";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";

export interface LightboxItem {
  src: string;
  name: string;
  question?: number; // đích thảo luận: câu (dương) hoặc tệp ảnh đính kèm (-id); không có thì không có khung thảo luận
  poll?: boolean; // ảnh câu hỏi thật: có bình chọn đáp án
}

// Khung thảo luận theo câu / tệp (chỉ trang xem trước / xem đề, không bao giờ ở màn làm bài)
export interface LightboxDiscussion {
  examId: string;
  examTitle: string;
  counts: Record<string, number>;
  onChanged: () => void;
  focus?: { question: number; comment: string | null } | null; // mở từ thông báo: mở khung thảo luận, cuộn tới bình luận
}

// Phím thuộc về ô đang gõ hoặc hộp thoại khác (báo cáo, xoá) mở chồng lên trình xem ảnh
const ownsKeys = (target: EventTarget | null, root: HTMLElement | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const modal = target.closest('[aria-modal="true"]');
  return (!!modal && modal !== root) || target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
};

// Xem ảnh các trang trong lớp phủ: đếm trang, thu/phóng, xoay, tự chạy, toàn màn hình, tải, mở tab mới, mũi tên và dải ảnh nhỏ bên dưới.
// Thu/phóng dùng chung logic với cửa sổ xem ảnh khi luyện đề: bấm vào ảnh để phóng quanh điểm bấm, đã phóng thì kéo chuột (bàn tay) để di chuyển.
const BTN = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent";
const SLIDE_MS = 3000;

export function ImageLightbox({ items, index, onIndex, onClose, discussion }: { items: LightboxItem[]; index: number; onIndex: (i: number) => void; onClose: () => void; discussion?: LightboxDiscussion }) {
  const z = useImageZoom({ topAlign: true });
  const [turns, setTurns] = useState(0); // số lần xoay 90° theo chiều kim đồng hồ
  const [playing, setPlaying] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  // Máy tính: khung thảo luận mở sẵn bên phải; điện thoại: tấm kéo từ dưới lên, mở bằng nút trên thanh công cụ
  const focus = discussion?.focus ?? null;
  const [panelOpen, setPanelOpen] = useState(() => !!focus || window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    if (focus) setPanelOpen(true);
  }, [focus]);
  const [unavailable, setUnavailable] = useState(false);
  const item = items[index]!;
  const last = items.length - 1;
  const hasPanel = !!discussion && !unavailable && item.question !== undefined;
  const countOf = (it: LightboxItem) => (discussion && it.question !== undefined ? (discussion.counts[String(it.question)] ?? 0) : 0);

  const go = useCallback((i: number) => onIndex(Math.min(last, Math.max(0, i))), [onIndex, last]);

  // Sang ảnh khác: giữ mức phóng đang dùng (chỉ nút % mới về 100%), bỏ xoay; ảnh mới tự hiện từ đầu trang (onImageLoad)
  useEffect(() => setTurns(0), [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ownsKeys(e.target, root.current)) return;
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
    <div ref={root} role="dialog" aria-modal="true" aria-label={item.name} className="md-scrim-in fixed inset-0 z-[60] flex bg-black text-white">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-medium tabular-nums">
            {index + 1} / {items.length}
          </span>
          {/* Điện thoại hẹp: các nút cuộn ngang trong thanh, không đẩy cả trang rộng ra */}
          <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
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
            <span className="mx-1 hidden h-6 w-px bg-white/20 sm:block" />
            <button type="button" onClick={() => setPlaying((p) => !p)} disabled={items.length < 2} aria-label={playing ? "Dừng tự chạy" : "Tự chạy"} className={`${BTN} hidden sm:flex`}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button type="button" onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)} aria-label="Toàn màn hình" className={`${BTN} hidden sm:flex`}>
              <Maximize size={20} />
            </button>
            <button type="button" onClick={() => void downloadProtectedImage(item.src, item.name).catch(() => undefined)} aria-label="Tải về" className={BTN}>
              <Download size={20} />
            </button>
            <button type="button" onClick={() => void openProtectedImage(item.src)} aria-label="Mở tab mới" className={BTN}>
              <ExternalLink size={20} />
            </button>
            {hasPanel && (
              <button type="button" onClick={() => setPanelOpen((o) => !o)} aria-pressed={panelOpen} aria-label={panelOpen ? "Ẩn thảo luận" : "Hiện thảo luận"} className={`${BTN} ${panelOpen ? "bg-white/15" : ""}`}>
                <MessageSquare size={20} />
              </button>
            )}
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
              <div className="relative mx-auto shrink-0" style={{ width: z.imgWidth, maxWidth: "none" }}>
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
                aria-label={`Xem ${it.name}${countOf(it) > 0 ? `, ${countOf(it)} bình luận` : ""}`}
                aria-current={i === index}
                className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-white outline-none ${i === index ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"}`}
              >
                <ProtectedImg src={it.src} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                {countOf(it) > 0 && <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 text-[11px] font-medium leading-5 text-on-primary"><MessageSquare size={10} aria-hidden />{countOf(it)}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasPanel && panelOpen && discussion && (
        <aside aria-label="Thảo luận" className="fixed inset-x-0 bottom-0 z-10 h-[75vh] overflow-hidden rounded-t-m3-xl shadow-m3-3 lg:static lg:h-auto lg:w-[380px] lg:shrink-0 lg:rounded-none lg:shadow-none">
          <DiscussionPanel
            key={`${discussion.examId}:${item.question}`}
            examId={discussion.examId}
            examTitle={discussion.examTitle}
            question={item.question!}
            position={item.question! < 0 ? item.name : `Ảnh ${index + 1}/${items.length}`}
            poll={!!item.poll}
            onChanged={discussion.onChanged}
            onUnavailable={() => setUnavailable(true)}
            onHide={() => setPanelOpen(false)}
            focusComment={focus && focus.question === item.question ? focus.comment : null}
          />
        </aside>
      )}
    </div>,
    document.body,
  );
}
