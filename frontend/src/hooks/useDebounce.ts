import { useEffect, useState } from "react";

// Trì hoãn giá trị đổi liên tục (ô tìm kiếm) để không gọi API sau mỗi phím gõ
export function useDebounce<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
