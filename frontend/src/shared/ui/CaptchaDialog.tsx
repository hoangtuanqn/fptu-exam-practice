import { Modal } from "./Modal";
import { Turnstile } from "./Turnstile";

/** Hộp thoại captcha: hiện khi cần, có token là gọi onVerified (nơi gọi tự đóng hộp). Đóng bằng Esc/bấm nền = huỷ. */
export function CaptchaDialog({ onVerified, onClose }: { onVerified: (token: string) => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="md-title-large text-on-surface">Xác minh bạn không phải robot</h2>
      <p className="md-body-medium mt-1 text-on-surface-variant">Hoàn tất bước dưới đây để tiếp tục.</p>
      <div className="mt-5 flex min-h-[65px] justify-center">
        <Turnstile onToken={(t) => t && onVerified(t)} />
      </div>
    </Modal>
  );
}
