import { useEffect, useRef, useState } from "react";
import { isSnoozed, snooze } from "@/shared/utils/promptSnooze";

const SURFACE = "rapid-nav-hint";
const STEPS = 6; // từng đó lần chuyển câu liền kề (±1)...
const WITHIN_MS = 5000; // ...trong từng đó thời gian thì coi là đang đi tìm một câu nào đó
const SHOW_MS = 12000;

// Người dùng bấm Trước/Tiếp (hoặc ← →) liên tục trong thời gian ngắn: nhiều khả năng họ đang tìm một câu nhưng chưa biết có danh sách câu.
// Hiện gợi ý một lần, đóng thì không hiện lại trong vài ngày. `enabled` = false khi không nên làm phiền (ví dụ đang thi tính giờ).
export function useRapidNavHint(current: number, enabled: boolean) {
  const [show, setShow] = useState(false);
  const prev = useRef(current);
  const steps = useRef<number[]>([]);

  useEffect(() => {
    const delta = Math.abs(current - prev.current);
    prev.current = current;
    if (delta !== 1) {
      steps.current = []; // nhảy xa (dùng danh sách câu) thì đã biết cách rồi
      return;
    }
    const now = Date.now();
    steps.current = [...steps.current.filter((t) => now - t <= WITHIN_MS), now];
    if (enabled && steps.current.length >= STEPS && !isSnoozed(SURFACE)) {
      steps.current = [];
      setShow(true);
    }
  }, [current, enabled]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [show]);

  const dismiss = () => {
    setShow(false);
    snooze(SURFACE);
  };
  return { show, dismiss };
}
