import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const STEP = 0.25;
const CLICK_ZOOM = 2; // mức phóng khi bấm vào ảnh

// Logic phóng to/thu nhỏ ảnh: nút +/−, bấm vào ảnh để phóng quanh điểm bấm, bấm lại để thu nhỏ.
// resetKey đổi (ví dụ đổi câu) thì mức phóng về 100%.
export function useImageZoom(resetKey: unknown) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null); // khung cuộn chứa ảnh
  const imgRef = useRef<HTMLImageElement>(null);
  const focus = useRef<{ x: number; y: number } | null>(null); // điểm vừa bấm (tỉ lệ 0–1 trên ảnh)

  useEffect(() => setZoom(1), [resetKey]);

  // Sau khi phóng to, cuộn để điểm vừa bấm nằm giữa khung nhìn
  useLayoutEffect(() => {
    const box = scrollRef.current;
    const img = imgRef.current;
    if (!box || !img || !focus.current) return;
    const boxRect = box.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    // vị trí điểm bấm tính theo hệ tọa độ cuộn của khung
    const pointX = imgRect.left - boxRect.left + box.scrollLeft + focus.current.x * imgRect.width;
    const pointY = imgRect.top - boxRect.top + box.scrollTop + focus.current.y * imgRect.height;
    box.scrollLeft = pointX - box.clientWidth / 2;
    box.scrollTop = pointY - box.clientHeight / 2;
    focus.current = null;
  }, [zoom]);

  const change = (delta: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 100) / 100)));

  // Bấm vào ảnh: đang vừa khung -> phóng to; đang phóng to -> thu nhỏ lại
  function toggleAt(e: React.MouseEvent<HTMLImageElement>) {
    if (zoom <= 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      focus.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
      setZoom(CLICK_ZOOM);
    } else {
      setZoom(1);
    }
  }

  return {
    zoom,
    scrollRef,
    imgRef,
    toggleAt,
    zoomIn: () => change(STEP),
    zoomOut: () => change(-STEP),
    reset: () => setZoom(1),
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
  };
}
