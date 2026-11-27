import { useEffect, useState } from "react";

// true khi `busy` kéo dài quá `delay` mili giây. Chờ ngắn hơn thì màn hình không đổi gì: không nháy, và không tốn công vẽ theo từng phím.
export function useSlow(busy: boolean, delay = 150) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) return setSlow(false);
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [busy, delay]);
  return busy && slow;
}
