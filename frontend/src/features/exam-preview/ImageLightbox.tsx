import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";

// Xem ảnh trang đề trong lớp phủ: hiện đúng cỡ gốc của ảnh (không kéo giãn; chỉ thu nhỏ khi lớn hơn màn hình).
// Bấm vào ảnh để phóng to (cỡ gốc, hoặc gấp đôi nếu ảnh vốn đã nhỏ), bấm lần nữa để về như cũ.
export function ImageLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cỡ đang thu nhỏ vừa màn hình chưa? Chưa (ảnh lớn hơn màn hình) thì phóng to = cỡ gốc; rồi (ảnh nhỏ) thì phóng to gấp đôi
  const fits = natural ? natural.w <= window.innerWidth - 32 && natural.h <= window.innerHeight - 96 : true;
  const zoomStyle = zoomed && natural ? { width: natural.w * (fits ? 2 : 1), maxWidth: "none", maxHeight: "none" } : { maxWidth: "calc(100vw - 2rem)", maxHeight: "calc(100dvh - 6rem)" };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="md-scrim-in fixed inset-0 z-[60] flex overflow-auto bg-black/85"
    >
      <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3 text-white">
        <span className="truncate text-sm font-medium">{name}</span>
        <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/15">
          <X size={22} />
        </button>
      </div>
      <div className="m-auto p-4 pt-16" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <ProtectedImg
          src={src}
          alt={`Ảnh ${name} của đề`}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          onClick={() => setZoomed((z) => !z)}
          title={zoomed ? "Bấm để thu nhỏ" : "Bấm để phóng to"}
          className={`block h-auto max-w-none bg-white ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          style={zoomStyle}
        />
      </div>
    </div>,
    document.body,
  );
}
