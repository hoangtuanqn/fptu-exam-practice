import { useEffect, useRef, useState } from "react";

const TICK_MS = 250;
const MAX = 98; // chưa xong thì không bao giờ chạm 100

export interface ProgressHint {
  floor: number; // mốc đã chắc chắn đạt (từ tiến độ thật), thanh không bao giờ thấp hơn
  ceiling: number; // trần của giai đoạn hiện tại: giữa hai lần cập nhật thanh chỉ trôi tới đây
}

/**
 * Thanh tiến độ "mô phỏng" (simulated / trickle progress như NProgress) có neo vào tiến độ thật.
 * Khi biết một phần (ví dụ đã tải 12/50 ảnh) ta truyền `hint`: thanh nhảy lên mốc thật `floor`, rồi trôi chậm dần
 * về `ceiling` của giai đoạn đó (đường cong tiệm cận) để người dùng luôn thấy chuyển động. Không có hint thì
 * chạy như thanh giả thuần túy. Khi `done` bằng true thì lên 100%.
 *
 * Mỗi nhịp tiến thêm một phần của quãng còn lại: p += (ceiling - p) * rate, nên càng gần trần càng chậm.
 */
export function useFakeProgress(active: boolean, done: boolean, hint?: ProgressHint) {
  const [percent, setPercent] = useState(0);
  const hintRef = useRef(hint);
  hintRef.current = hint;

  useEffect(() => {
    if (!active) {
      setPercent(0);
      return;
    }
    if (done) {
      setPercent(100);
      return;
    }
    const id = setInterval(() => {
      setPercent((p) => {
        const floor = hintRef.current?.floor ?? 0;
        const ceiling = Math.min(MAX, hintRef.current?.ceiling ?? MAX);
        const from = Math.max(p, floor); // nhảy lên mốc thật nếu đã vượt, không bao giờ lùi
        const rate = 0.05 + Math.random() * 0.04; // rung nhẹ để không đều như máy
        return Math.min(ceiling, from + (ceiling - from) * rate);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, done]);

  return Math.round(percent);
}
