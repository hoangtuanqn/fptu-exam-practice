import { useEffect, useRef } from "react";
import { useToast } from "@/shared/context/ToastContext";

const MARKS = [
  { sec: 300, text: "Còn dưới 5 phút" },
  { sec: 60, text: "Còn dưới 1 phút" },
];

// Chế độ Thi có giới hạn: nhắc ngắn khi còn 5 phút và 1 phút (đồng hồ chỉ đổi màu, dễ bỏ sót khi đang nhìn đề).
// Bài ngắn thì bỏ mốc quá gần lúc bắt đầu. `limitSec` null = không nhắc.
export function useTimeWarnings(limitSec: number | null, elapsed: number) {
  const toast = useToast();
  const fired = useRef(new Set<number>());

  useEffect(() => {
    if (!limitSec) return;
    if (elapsed === 0) fired.current.clear();
    const left = limitSec - elapsed;
    const hit = [...MARKS].reverse().find((m) => limitSec > m.sec * 2 && left > 0 && left <= m.sec); // mốc nhỏ nhất đã qua
    if (!hit || fired.current.has(hit.sec)) return;
    MARKS.forEach((m) => m.sec >= hit.sec && fired.current.add(m.sec)); // vào lại bài khi đã qua cả hai mốc thì chỉ nhắc một lần
    toast.error(hit.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitSec, elapsed]);
}
