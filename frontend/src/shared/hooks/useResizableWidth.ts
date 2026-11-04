import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

interface Options {
  storageKey: string; // nhớ độ rộng người dùng đã chọn giữa các lần mở
  initial: () => number; // độ rộng mặc định (gọi lúc cần, vì phụ thuộc cỡ màn hình)
  min: number;
  max: () => number; // giới hạn trên theo cỡ màn hình hiện tại (chừa chỗ cho vùng còn lại)
  step?: number; // mỗi lần bấm phím mũi tên
}

const read = (key: string): number | null => {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: number | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(Math.round(value)));
  } catch {
    /* bỏ qua: trình duyệt chặn lưu trữ */
  }
};

/**
 * Độ rộng của một khung nằm bên phải, kéo mép trái để co dãn (kéo sang trái = rộng ra, sang phải = hẹp lại).
 * Dùng pointer events nên chuột, cảm ứng và bút đều được; có phím mũi tên cho bàn phím, nhấp đúp để về mặc định.
 * Độ rộng luôn được giữ trong [min, max()] và tự co lại khi cửa sổ thu nhỏ.
 */
export function useResizableWidth({ storageKey, initial, min, max, step = 24 }: Options) {
  const clamp = useCallback((w: number) => Math.round(Math.max(min, Math.min(w, Math.max(min, max())))), [min, max]);
  const [width, setWidth] = useState(() => clamp(read(storageKey) ?? initial()));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const latest = useRef(width);
  latest.current = width;

  // Thu nhỏ cửa sổ thì khung không được rộng quá phần cho phép
  useEffect(() => {
    const onResize = () => setWidth((w) => clamp(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId); // tiếp tục nhận sự kiện kể cả khi con trỏ ra ngoài tay kéo
      drag.current = { startX: e.clientX, startWidth: latest.current };
      setDragging(true);
      document.body.style.userSelect = "none"; // kéo không bôi đen chữ
      document.body.style.cursor = "col-resize";
    },
    [],
  );
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!drag.current) return;
      setWidth(clamp(drag.current.startWidth + (drag.current.startX - e.clientX)));
    },
    [clamp],
  );
  const end = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    write(storageKey, latest.current);
  }, [storageKey]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const delta = e.key === "ArrowLeft" ? step : e.key === "ArrowRight" ? -step : 0;
      if (!delta) return;
      e.preventDefault();
      const next = clamp(latest.current + (e.shiftKey ? delta * 4 : delta));
      setWidth(next);
      write(storageKey, next);
    },
    [clamp, step, storageKey],
  );

  const reset = useCallback(() => {
    write(storageKey, null);
    setWidth(clamp(initial()));
  }, [clamp, initial, storageKey]);

  return {
    width,
    dragging,
    min,
    max: Math.max(min, max()),
    handleProps: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onKeyDown, onDoubleClick: reset },
  };
}
