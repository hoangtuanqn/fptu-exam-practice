import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Đổi trang (đường dẫn khác) thì cuộn về đầu trang. Đổi bộ lọc/trang số trên cùng một trang (chỉ đổi query) hay link có #neo thì giữ nguyên.
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
