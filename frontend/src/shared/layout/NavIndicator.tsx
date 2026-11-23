import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Ô chọn trượt của menu: một viên nền duy nhất nằm sau mục đang chọn (đánh dấu bằng data-nav-active),
// khi đổi tab viên này trượt từ mục cũ tới mục mới thay vì tắt bật nền từng mục.
interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const same = (a: Box, b: Box) => a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

// Đo mục đang chọn theo toạ độ trong khung menu (cộng phần đã cuộn). Gọi sau mỗi lần render để bám đúng khi đổi trang/nhóm.
export function useNavIndicator<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const nav = ref.current;
    if (!nav) return;
    const el = nav.querySelector<HTMLElement>("[data-nav-active]");
    if (!el) return setBox(null);
    const n = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const next = { top: r.top - n.top + nav.scrollTop, left: r.left - n.left + nav.scrollLeft, width: r.width, height: r.height };
    setBox((prev) => (prev && same(prev, next) ? prev : next));
  }, []);

  // Đo ngay sau mỗi lần render (trước khi vẽ) để viên chọn bám đúng mục mới
  useLayoutEffect(() => measure());

  // Đo lại khi khung menu đổi kích thước (mở/đóng nhóm, xoay màn hình)
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measure]);

  // Lần đầu đặt viên chọn ngay tại chỗ (không trượt từ góc); từ lần sau mới bật chuyển động
  useEffect(() => {
    if (box) setAnimate(true);
  }, [box]);

  return { ref, box, animate };
}

export function NavIndicator({ box, animate }: { box: Box | null; animate: boolean }) {
  if (!box) return null;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 rounded-full bg-secondary-container ${animate ? "transition-[transform,width,height] duration-300 ease-out" : ""}`}
      style={{ width: box.width, height: box.height, transform: `translate(${box.left}px, ${box.top}px)` }}
    />
  );
}
