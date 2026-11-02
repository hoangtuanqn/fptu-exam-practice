import { useEffect, useRef } from "react";

// Lắng nghe phím bấm toàn trang (bỏ qua tổ hợp Ctrl/Alt/Cmd). Tắt bằng enabled = false.
export function useKeydown(handler: (e: KeyboardEvent) => void, enabled = true) {
  const latest = useRef(handler);
  latest.current = handler; // luôn gọi bản handler mới nhất mà không phải gắn lại listener

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      latest.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
