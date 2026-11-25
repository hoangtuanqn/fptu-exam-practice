import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const STEP = 0.25;
const WHEEL_SPEED = 0.0015; // độ nhạy con lăn: hệ số phóng = e^(-deltaY * WHEEL_SPEED)

// Logic phóng to/thu nhỏ ảnh: nút +/−, con lăn chuột (phóng quanh con trỏ); ảnh tràn khung thì kéo chuột để di chuyển (bàn tay). Bấm vào ảnh không làm gì.
// Mức phóng và vị trí đang xem (tâm khung nhìn, tỉ lệ 0–1 trên ảnh) được giữ khi đổi câu; nút "đặt lại" mới về 100%.
// topAlign: ảnh mới nạp / đặt lại thì hiện từ ĐẦU ảnh (cuộn lên đầu) thay vì giữa ảnh; dùng cho xem lần lượt các trang đề.
export function useImageZoom({ topAlign = false }: { topAlign?: boolean } = {}) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null); // khung cuộn chứa ảnh
  const imgRef = useRef<HTMLImageElement>(null);
  const center = useRef({ x: 0.5, y: 0.5 }); // điểm trên ảnh đang nằm giữa khung nhìn
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const [canPan, setCanPan] = useState(false); // ảnh đang tràn khung: có gì đó để kéo
  const zoomNow = useRef(1);
  zoomNow.current = zoom;
  const anchor = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null); // điểm trên ảnh phải đứng yên dưới con trỏ sau khi đổi mức phóng (con lăn)

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

  const measure = () => {
    const box = scrollRef.current;
    if (box) setCanPan(box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1);
  };

  useLayoutEffect(() => {
    const box = scrollRef.current;
    const img = imgRef.current;
    const a = anchor.current;
    anchor.current = null;
    if (a && box && img) {
      // Con lăn: đặt lại cuộn để điểm dưới con trỏ vẫn nằm đúng chỗ cũ
      const boxRect = box.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      box.scrollLeft = imgRect.left - boxRect.left + box.scrollLeft + a.fx * imgRect.width - a.px;
      box.scrollTop = imgRect.top - boxRect.top + box.scrollTop + a.fy * imgRect.height - a.py;
      onScroll();
    } else apply();
    measure();
  }, [zoom]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Con lăn phóng/thu quanh con trỏ. Gắn tay với passive:false để chặn được việc cuộn trang phía sau
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      const img = imgRef.current;
      if (!img) return;
      e.preventDefault();
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoomNow.current * Math.exp(-Math.max(-100, Math.min(100, e.deltaY)) * WHEEL_SPEED) * 1000) / 1000));
      if (next === zoomNow.current) return;
      const boxRect = box.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      anchor.current = {
        fx: (e.clientX - imgRect.left) / imgRect.width,
        fy: (e.clientY - imgRect.top) / imgRect.height,
        px: e.clientX - boxRect.left,
        py: e.clientY - boxRect.top,
      };
      setZoom(next);
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);

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

  // Kéo chuột để di chuyển ảnh khi đã phóng to (cảm ứng đã vuốt để cuộn được sẵn)
  const dragProps = {
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      const box = scrollRef.current;
      if (!box || (box.scrollWidth <= box.clientWidth && box.scrollHeight <= box.clientHeight) || e.pointerType !== "mouse" || e.button !== 0) return;
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
    onImageLoad: () => {
      if (topAlign && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
        onScroll();
      } else apply(); // ảnh câu mới nạp xong: đưa về đúng vị trí đang xem
      measure();
    },
    canPan,
    dragProps,
    grabbing,
    zoomIn: () => change(STEP),
    zoomOut: () => change(-STEP),
    reset: () => {
      center.current = { x: 0.5, y: 0.5 };
      if (topAlign && scrollRef.current) scrollRef.current.scrollTop = 0;
      setZoom(1);
    },
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
  };
}
