import { useEffect, useState } from "react";

// Đếm ngược tới `target` (ISO). Trả về số giây còn lại, tối thiểu 0.
export function useCountdown(target: string | undefined) {
  const calc = () => (target ? Math.max(0, Math.round((new Date(target).getTime() - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    setLeft(calc());
    const timer = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return left;
}
