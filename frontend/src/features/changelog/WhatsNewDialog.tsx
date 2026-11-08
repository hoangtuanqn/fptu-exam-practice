import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatDate } from "@/shared/utils/formatters";
import { APP_VERSION, CHANGELOG } from "./changelog";

const KEY = "fepass.seenVersion";

// Hộp thoại "Có gì mới" hiện MỘT lần sau khi web lên phiên bản mới (với người đã từng ghé thăm).
// Người mới hoàn toàn không bị hiện: lần đầu chỉ ghi nhớ phiên bản hiện tại. Không hiện khi đang làm đề hoặc đang ở trang lịch sử thay đổi.
export function WhatsNewDialog() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const skip = pathname.startsWith("/exam/") || pathname === "/changelog";

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const seen = localStorage.getItem(KEY);
      if (seen === null || pathname === "/changelog") localStorage.setItem(KEY, APP_VERSION);
      else if (seen !== APP_VERSION && !skip) timer = setTimeout(() => setOpen(true), 1500);
    } catch {
      /* trình duyệt chặn lưu trữ: không hiện hộp thoại để khỏi lặp lại mỗi lần tải trang */
    }
    return () => clearTimeout(timer);
  }, [pathname, skip]);

  const close = () => {
    try {
      localStorage.setItem(KEY, APP_VERSION);
    } catch {
      /* bỏ qua */
    }
    setOpen(false);
  };

  if (!open) return null;
  const release = CHANGELOG.web[0]!;
  return (
    <Modal onClose={close}>
      <ModalTitle icon={Sparkles}>Có gì mới ở v{release.version}</ModalTitle>
      <p className="md-body-small mt-1 text-on-surface-variant">
        {release.title} · {formatDate(release.date)}
      </p>
      <ul className="md-body-medium mt-4 space-y-2 text-on-surface">
        {release.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {h}
          </li>
        ))}
      </ul>
      <ModalActions>
        <Button onClick={close}>Đóng</Button>
        <Link to="/changelog" onClick={close} className={buttonClass({ variant: "filled" })}>
          Xem chi tiết
        </Link>
      </ModalActions>
    </Modal>
  );
}
