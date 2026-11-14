import { useState } from "react";

const KEY = "practice.imageScale";
const STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];
// Máy tính: ảnh rộng hơn khung một chút để chữ trong đề đủ to. Điện thoại: vừa chiều ngang màn hình (to hơn là phải kéo ngang, rất khó đọc).
// Người dùng chỉnh được và máy nhớ lại.
const defaultScale = () => (typeof window !== "undefined" && window.matchMedia?.("(min-width: 1024px)").matches ? 1.25 : 1);

const read = () => {
  try {
    const v = Number(localStorage.getItem(KEY));
    return STEPS.includes(v) ? v : defaultScale();
  } catch {
    return defaultScale(); // trình duyệt chặn lưu trữ
  }
};

// Cỡ ảnh đề trong khung câu hỏi (tỉ lệ so với chiều rộng khung). Nhớ lại giữa các câu và các lần làm bài.
export function useQuestionImageScale() {
  const [scale, setScale] = useState(read);
  const change = (next: number) => {
    setScale(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* không lưu được thì thôi, vẫn đổi cỡ trong phiên này */
    }
  };
  const index = STEPS.indexOf(scale);
  return {
    scale,
    canZoomIn: index < STEPS.length - 1,
    canZoomOut: index > 0,
    zoomIn: () => change(STEPS[Math.min(STEPS.length - 1, index + 1)]!),
    zoomOut: () => change(STEPS[Math.max(0, index - 1)]!),
    reset: () => change(defaultScale()),
  };
}
