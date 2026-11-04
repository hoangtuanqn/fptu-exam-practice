import { useEffect, useState } from "react";

// Đồng hồ đếm giây. running = false thì tạm dừng (giữ nguyên số giây); resetKey đổi thì về `initial` (mặc định 0,
// khác 0 khi làm tiếp một lượt dở dang).
export function useStopwatch(running: boolean, resetKey: unknown, initial = 0) {
  const [seconds, setSeconds] = useState(initial);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setSeconds(initial), [resetKey]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return seconds;
}
