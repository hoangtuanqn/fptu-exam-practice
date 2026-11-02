import { useEffect, useState } from "react";

// Đồng hồ đếm giây. running = false thì tạm dừng (giữ nguyên số giây); resetKey đổi thì về 0.
export function useStopwatch(running: boolean, resetKey: unknown) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => setSeconds(0), [resetKey]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return seconds;
}
