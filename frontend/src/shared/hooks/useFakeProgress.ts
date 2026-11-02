import { useEffect, useState } from "react";

const TICK_MS = 250;
const CEILING = 94; // chưa xong thì không bao giờ chạm 100

/**
 * Thanh tiến độ "giả" (simulated / fake progress, còn gọi là trickle progress như NProgress):
 * không biết phần trăm thật nên tự tăng nhanh lúc đầu rồi chậm dần về gần trần (đường cong tiệm cận),
 * để người dùng thấy hệ thống đang chạy. Khi `done` bằng true thì nhảy lên 100%.
 *
 * Mỗi nhịp tiến thêm một phần của quãng còn lại: p += (CEILING - p) * rate, nên càng gần trần càng chậm.
 */
export function useFakeProgress(active: boolean, done: boolean) {
  const [percent, setPercent] = useState(0);

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
        const rate = 0.04 + Math.random() * 0.04; // rung nhẹ để không đều như máy
        return Math.min(CEILING, p + (CEILING - p) * rate);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, done]);

  return Math.round(percent);
}
