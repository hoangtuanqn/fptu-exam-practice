import { useState } from "react";

const KEY = "practice.imageScale";
const STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];
const DEFAULT = 1; // ảnh rộng vừa khung; chữ trong đề to hơn nhiều so với co ảnh vừa cả chiều cao

const read = () => {
  try {
    const v = Number(localStorage.getItem(KEY));
    return STEPS.includes(v) ? v : DEFAULT;
  } catch {
    return DEFAULT; // trình duyệt chặn lưu trữ
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
    reset: () => change(DEFAULT),
  };
}
