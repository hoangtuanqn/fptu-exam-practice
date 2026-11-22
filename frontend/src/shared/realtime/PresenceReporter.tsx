import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { reportPage } from "./socket";

const UUID = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{4,}/gi;

// Báo trang đang xem mỗi khi đổi trang (không hỏi định kỳ). Bỏ mã đề/id và query để không lộ nội dung riêng.
export function PresenceReporter() {
  const { pathname } = useLocation();
  useEffect(() => reportPage(pathname.replace(UUID, "/:id").replace(/\/\d+(?=\/|$)/g, "/:id")), [pathname]);
  return null;
}
