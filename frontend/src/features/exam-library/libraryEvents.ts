import { useEffect } from "react";

const EVENT = "library-changed";

// Kho đề vừa đổi ở nơi khác (ví dụ đề của khách được chuyển về tài khoản sau khi đăng nhập): các màn đang mở tải lại danh sách
export const notifyLibraryChanged = () => window.dispatchEvent(new Event(EVENT));

export function useOnLibraryChanged(fn: () => void) {
  useEffect(() => {
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
  }, [fn]);
}
