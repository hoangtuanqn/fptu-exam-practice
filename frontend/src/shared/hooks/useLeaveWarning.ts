import { useEffect } from "react";

// Hỏi lại khi người dùng đóng tab/tải lại trang lúc `active` (trình duyệt tự hiện hộp thoại, không đổi được nội dung)
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Chrome cần giá trị này mới hiện hộp thoại
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
