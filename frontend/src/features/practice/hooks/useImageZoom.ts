import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const STEP = 0.25;
const CLICK_ZOOM = 2; // mức phóng khi bấm vào ảnh

// Logic phóng to/thu nhỏ ảnh: nút +/−, bấm vào ảnh để phóng quanh điểm bấm; khi đã phóng thì kéo chuột để di chuyển ảnh (thu nhỏ bằng nút −/100%).
// Mức phóng và vị trí đang xem (tâm khung nhìn, tỉ lệ 0–1 trên ảnh) được giữ khi đổi câu; nút "đặt lại" mới về 100%.
export function useImageZoom() {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null); // khung cuộn chứa ảnh
  const imgRef = useRef<HTMLImageElement>(null);
  const center = useRef({ x: 0.5, y: 0.5 }); // điểm trên ảnh đang nằm giữa khung nhìn
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  // Cuộn để `center` nằm giữa khung nhìn (gọi sau khi đổi mức phóng hoặc nạp ảnh câu mới)
  const apply = () => {
    const box = scrollRef.current;
    const img = imgRef.current;
    if (!box || !img) return;
    const boxRect = box.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    box.scrollLeft = imgRect.left - boxRect.left + box.scrollLeft + center.current.x * imgRect.width - box.clientWidth / 2;
    box.scrollTop = imgRect.top - boxRect.top + box.scrollTop + center.current.y * imgRect.height - box.clientHeight / 2;
  };

  useLayoutEffect(apply, [zoom]);

  // Người dùng cuộn thì nhớ lại điểm đang ở giữa; trục nào không tràn khung thì bỏ qua (ảnh đang nằm giữa sẵn)
  const onScroll = () => {
    const box = scrollRef.current;
    const img = imgRef.current;
    if (!box || !img) return;
    const boxRect = box.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (box.scrollWidth > box.clientWidth) center.current.x = (boxRect.left + box.clientWidth / 2 - imgRect.left) / imgRect.width;
    if (box.scrollHeight > box.clientHeight) center.current.y = (boxRect.top + box.clientHeight / 2 - imgRect.top) / imgRect.height;
  };

  const change = (delta: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 100) / 100)));

  // Bấm vào ảnh đang vừa khung -> phóng to quanh điểm bấm. Đã phóng to thì bấm không làm gì (kéo để di chuyển, xem dưới)
  function toggleAt(e: React.MouseEvent<HTMLImageElement>) {
    if (zoom > 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    center.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    setZoom(CLICK_ZOOM);
  }

  // Kéo chuột để di chuyển ảnh khi đã phóng to (cảm ứng đã vuốt để cuộn được sẵn)
  const dragProps = {
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      const box = scrollRef.current;
      if (!box || zoom <= 1 || e.pointerType !== "mouse" || e.button !== 0) return;
      drag.current = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop };
      e.currentTarget.setPointerCapture(e.pointerId);
      setGrabbing(true);
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      const box = scrollRef.current;
      if (!drag.current || !box) return;
      box.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
      box.scrollTop = drag.current.top - (e.clientY - drag.current.y);
    },
    onPointerUp() {
      drag.current = null;
      setGrabbing(false);
    },
    onPointerCancel() {
      drag.current = null;
      setGrabbing(false);
    },
    onDragStart: (e: React.DragEvent) => e.preventDefault(), // không để trình duyệt kéo cả tấm ảnh ra ngoài
  };

  return {
    zoom,
    scrollRef,
    imgRef,
    onScroll,
    onImageLoad: apply, // ảnh câu mới nạp xong: đưa về đúng vị trí đang xem
    toggleAt,
    dragProps,
    grabbing,
    zoomIn: () => change(STEP),
    zoomOut: () => change(-STEP),
    reset: () => {
      center.current = { x: 0.5, y: 0.5 };
      setZoom(1);
    },
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
  };
}
